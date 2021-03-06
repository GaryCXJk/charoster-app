import deepmerge from "deepmerge";
import * as path from "path";
import isSvg from "is-svg";
import { getWorkFolder } from "./config-manager";
import { queueEntity } from "./file-manager";
import createWaiter from "../../helpers/create-waiter";
import { readdir, readFile, stat } from "fs/promises";
import { showError } from "./error-manager";
import { awaitPackDiscovery } from "./packs-manager";
import { ipcMain } from "electron";
import { onAppReset } from "../helpers/manager-helper";
import { clearObject } from "../../helpers/object-helper";
import * as defDefinitions from '../../global/definitions';

const images = {};
const definitions = {};
const definitionNotifier = {};
const definitionEntities = {};
const definitionFiles = {};
const definitionQueue = [];
const definitionDiscovery = {};
const waiting = {};
const arrayables = [];
const entityFields = {};

let queueIsRunning = null;

export const checkArrayables = (input) => Object.keys(input).filter((key) => arrayables.includes(key));

const processSvg = async (value, definition) => {
  const folder = definition.folder ?? definition.id;
  const [packId, ...segments] = value.split('>');
  const workFolder = getWorkFolder();
  const workPath = path.join(workFolder, 'packs', packId, folder, ...segments);
  try {
    const content = await readFile(workPath, {
      encoding: 'utf-8',
    });

    if (!isSvg(content)) {
      return null;
    }
    return {
      type: 'svg',
      file: segments.slice(-1)[0],
      fullId: `${packId}>${segments.join('>')}`,
      content,
    };
  } catch (_e) {
    return null;
  }
}

const processImage = async (value, definition) => {
  let currentImageCache = images[value];
  if (currentImageCache) {
    if (currentImageCache instanceof Promise) {
      await currentImageCache;
      currentImageCache = images[value] ?? null;
    }
    return currentImageCache;
  }
  const waiter = createWaiter();
  images[value] = waiter;
  const folder = definition.folder ?? definition.id;
  const [packId, ...segments] = value.split('>');
  const workFolder = getWorkFolder();
  const workPath = path.join(workFolder, 'packs', packId, folder, ...segments);
  try {
    const sharpImage = new Sharp(workPath);

    const buffer = await sharpImage
      .png()
      .toBuffer();

    images[value] = {
      type: 'image',
      file: segments.slice(-1)[0],
      fullId: `${packId}>${segments.join('>')}`,
      buffer,
      data: `data:image/png;base64,${buffer.toString('base64')}`,
    };
    waiter.resolve();
    return images[value];
  } catch (_e) {
    images[value] = null;
    waiter.resolve();
    return null;
  }
}

const processEntity = async (type, value, definition) => {
  if (Array.isArray(value)) {
    const newArray = [];
    for (let idx = 0; idx < value.length; idx += 1) {
      const val = await processEntity(type, value[idx], definition);
      newArray.push(val);
    }
    return newArray;
  }
  const types = type.split(',');
  if (types.length > 1) {
    for (let idx = 0; idx < types.length; idx += 1) {
      const val = await processEntity(types[idx], value, definition);
      if (val !== null) {
        return val;
      }
    }
    return null;
  }
  switch (type) {
    case 'svg':
      return processSvg(value, definition);
    case 'image':
      return processImage(value, definition);
    default:
      return value;
  }
}

export const getDefinitionEntityValue = async (definitionId, entityIdSegments, field, fromPack = null) => {
  const definition = definitions[definitionId];
  const entity = await loadDefinitionEntity(definitionId, entityIdSegments, fromPack);
  if (!entity?.[field] && !entity?.meta?.[field]) {
    return null;
  }
  let type = 'string';
  if (field === 'meta') {
    type = 'object';
  }
  if (definition.fields?.[field]) {
    type = definition.fields[field];
    if (typeof type === 'object') {
      type = type.type;
    }
  }
  return await processEntity(type, entity[field] ?? entity.meta?.[field], definition);
};

const preprocessValues = (definition, packId, entityId, data) => {
  const fullEntityId = `${packId}>${entityId}`;
  Object.keys(definition.fields).forEach((field) => {
    if (!data[field]) {
      return;
    }
    const type = typeof definition.fields[field] === 'object' ? definition.fields[field].type : definition.fields[field];
    let isFile = true;
    type.split(',').every((t) => {
      if (['image', 'svg', 'json'].includes(t)) {
        return true;
      }
      isFile = false;
      return false;
    });

    if (isFile) {
      if (Array.isArray(data[field])) {
        data[field] = data[field].map((item) => `${fullEntityId}>${item}`);
      } else if (typeof data[field] === 'string') {
        data[field] = `${fullEntityId}>${data[field]}`;
      }
    }
  });
  return data;
}

const loadDefinitionEntity = async (definitionId, entityIdSegments, fromPack = null) => {
  await awaitPackDiscovery();
  const definition = definitions[definitionId];
  const entityId = entityIdSegments.join('>');
  const folder = definition.folder ?? definition.id;
  const fullEntityId = `${definitionId}:${entityId}`;

  if (!waiting[fullEntityId]) {
    waiting[fullEntityId] = createWaiter();
  }
  if (waiting[fullEntityId].state === 'init') {
    waiting[fullEntityId].setState('running');
    const waiter = waiting[fullEntityId];
    const workFolder = getWorkFolder();
    const searchFiles = [];

    if (fromPack) {
      searchFiles.push(
        [`${path.join(workFolder, 'packs', fromPack, folder, ...entityIdSegments)}.json`, fromPack, entityId],
      );
    }
    definition.packs.forEach((packId) => {
      searchFiles.push(
        [`${path.join(workFolder, 'packs', packId, folder, ...entityIdSegments)}.json`, packId, entityId]
      );
    });
    if(entityIdSegments.length > 1) {
      searchFiles.push(
        [`${path.join(workFolder, 'packs', entityIdSegments[0], folder, ...entityIdSegments.slice(1))}.json`, entityIdSegments[0], entityIdSegments.slice(1).join('>')]
      )
    }
    let json = null;
    for (let idx = 0; idx < searchFiles.length; idx += 1) {
      const [searchFile, currentPack, realEntityId] = searchFiles[idx];
      if (definitionFiles[searchFile]) {
        const usedEntityId = definitionFiles[searchFile];
        json = definitionEntities[definitionId][usedEntityId];
        waiter.resolve(json);
        // Since definition entities can change with each pack, we'll invalidate it every time.
        waiting[fullEntityId] = null;
        return json;
      }
      try {
        const fileContent = await readFile(searchFile, {
          encoding: 'utf-8',
        });

        json = JSON.parse(fileContent);

        json = preprocessValues(definition, currentPack, realEntityId, json);

        definitionEntities[definitionId] = definitionEntities[definitionId] ?? {};
        let usedEntityId = realEntityId;
        switch (definition.merge) {
          case 'auto':
            definitionEntities[definitionId][realEntityId] = definitionEntities[definitionId][realEntityId] ?? {};
            definitionEntities[definitionId][realEntityId] = deepmerge(definitionEntities[definitionId][realEntityId], json);
            json = definitionEntities[definitionId][realEntityId];
            break;
          case 'parent':
            if (json.parent) {
              definitionEntities[definitionId][json.parent] = definitionEntities[definitionId][json.parent] ?? {};
              definitionEntities[definitionId][json.parent] = deepmerge(definitionEntities[definitionId][json.parent], json);
              usedEntityId = json.parent;
            } else {
              definitionEntities[definitionId][realEntityId] = definitionEntities[definitionId][realEntityId] ?? {};
              definitionEntities[definitionId][realEntityId] = deepmerge(definitionEntities[definitionId][realEntityId], json);
            }
            json = definitionEntities[definitionId][usedEntityId];
            break;
          default:
            definitionEntities[definitionId][`${currentPack}>${realEntityId}`] = json;
            usedEntityId = `${currentPack}>${realEntityId}`;
            break;
        }

        definitionFiles[searchFile] = usedEntityId;
        waiter.resolve(json);
        // Since definition entities can change with each pack, we'll invalidate it every time.
        waiting[fullEntityId] = null;
        return json;
      } catch (e) {
        // We only want to stop processing if there's a JSON parsing error.
        if (e.name === 'SyntaxError') {
          showError(`There was an error loading ${searchFile}`);
          waiting[fullEntityId] = null;
          waiter.resolve();
          return null;
        }
      }
    }
    return null;
  } else {
    return await waiting[fullEntityId];
  }
}

const runDefinitionQueue = async () => {
  if (queueIsRunning) {
    return;
  }
  queueIsRunning = createWaiter();
  while (definitionQueue.length) {
    const [definitionId, ...entityIdSegments] = definitionQueue.shift().split('>');
    try {
      await loadDefinitionEntity(definitionId, entityIdSegments);
    } catch (_e) {
      // Do nothing, this is just for formality.
    }
  }
  queueIsRunning.resolve();
  queueIsRunning = null;
}

export const queueDefinitionEntity = (definitionId, entityId) => {
  queueEntity(definitionQueue, waiting, `${definitionId}>${entityId}`);

  runDefinitionQueue();
}

const discoverDefinitionEntities = async (packId, definitionId) => {
  const definition = definitions[definitionId];
  const folder = definition.folder ?? definition.id;
  const workFolder = getWorkFolder();
  const defPath = path.join(workFolder, 'packs', packId, folder);

  try {
    const foundFiles = await readdir(defPath);

    for (let idx = 0; idx < foundFiles.length; idx += 1) {
      const file = foundFiles[idx];
      if (!file.match(/\.json$/)) {
        continue;
      }
      try {
        const fileStats = await stat(path.join(defPath, file));
        if (fileStats.isFile()) {
          queueDefinitionEntity(definitionId, file.replace(/\.json$/, ''));
        }
      } catch(_e) {
        // Do nothing
      }
    }
  } catch (e) {
    // Do nothing
  }
}

const processFields = (id) => {
  const definition = definitions[id];
  const { fields } = definition;
  Object.keys(fields).forEach((key) => {
    const fieldData = fields[key];
    if (typeof fieldData === 'object' && fieldData.entityProp) {
      const fieldName = `${id}:${fieldData.entityProp}`;
      entityFields[fieldName] = {
        definition: id,
        field: key,
        type: fieldData.type,
        label: `${definition.name ?? `${id.slice(0, 1).toUpperCase()}${id.slice(1)}`} > ${fieldData.name ?? `${fieldData.entityProp.slice(0, 1).toUpperCase()}${fieldData.entityProp.slice(1)}`}`,
      };
    }
  });
};

export const addDefinition = (packId, definition) => {
  const id = (definition.namespace ?? true) ? `${definition.namespace ?? packId}:${definition.id}` : definition.id;
  definitions[id] = definitions[id] ?? {
    packs: [],
  };
  const packs = definitions[id].packs;
  let def = definitions[id].default ?? null;
  let defPriority = definitions[id].defaultPriority ?? 0;
  definitions[id] = deepmerge(definitions[id], definition);
  const setDefault = () => {
    def = definitions[id].default;
    defPriority = definitions[id].defaultPriority;
  };
  if (packId) {
    packs.push(packId);
  }
  if (definitions[id].default) {
    if ((definitions[id].defaultPriority ?? 0) > defPriority) {
      setDefault();
    } else if (definitions[id].default.localeCompare(def) > 0) {
      setDefault();
    }
  }
  definitions[id].default = def;
  definitions[id].defaultPriority = defPriority;
  definitions[id].packs = packs;
  definitionNotifier[id] = definitionNotifier[id] ?? createWaiter();
  definitionNotifier[id].resolve();
  if (definitions[id].list && !arrayables.includes(id)) {
    arrayables.push(id);
  }
  if (definitions[id].discover) {
    const discoveryProperty = definitions[id].discover === true ? definitions[id].id : definitions[id].discover;
    definitionDiscovery[discoveryProperty] = id;
  }
  if (definitions[id].fields) {
    processFields(id);
  }
  if (packId) {
    discoverDefinitionEntities(packId, id);
  }
  return id;
}

export const getDefinition = async (id) => {
  definitionNotifier[id] = definitionNotifier[id] ?? createWaiter();
  await definitionNotifier[id];
  return definitions[id];
}

export const autoDiscoverDefinitions = (packId, pack, ignore = []) => {
  Object.keys(definitionDiscovery).forEach((prop) => {
    const id = definitionDiscovery[prop];
    if (ignore.includes(id)) {
      return;
    }
    if (pack[prop]) {
      definitions[id].packs.push(packId);
      discoverDefinitionEntities(packId, id);
    }
  });
}

const setDefDefinitions = () => {
  Object.keys(defDefinitions).forEach((key) => {
    addDefinition(null, {
      ...defDefinitions[key],
      namespace: false,
    });
  });
}

ipcMain.handle('definitions:get-definition', async (_event, definitionId) => {
  return definitions[definitionId];
});

ipcMain.handle('definitions:get-definition-value', async (_event, definitionId, valueIds, field, fromPack = null) => {
  const values = !Array.isArray(valueIds) ? [valueIds] : valueIds;

  const ret = [];

  for (let idx = 0; idx < values.length; idx += 1) {
    const val = values[idx];
    const outVal = await getDefinitionEntityValue(definitionId, val.split('>'), field, fromPack);
    ret.push({
      key: val,
      value: outVal,
    });
  }
  const definition = definitions[definitionId];
  if (definition.list) {
    return ret;
  }
  return ret[0];
});

ipcMain.handle('definitions:get-entity-fields', () => entityFields);
ipcMain.handle('definitions:get-definition-entity', async (_event, definitionId, field, value) => {
  const definition = definitions[definitionId];

  let type = 'string';
  if (field === 'meta') {
    type = 'object';
  }
  if (definition.fields?.[field]) {
    type = definition.fields[field];
    if (typeof type === 'object') {
      type = type.type;
    }
  }

  return await processEntity(type, value, definition);
});

onAppReset(() => {
  clearObject(images);
  clearObject(definitions);
  clearObject(definitionNotifier);
  clearObject(definitionEntities);
  clearObject(definitionFiles);
  clearObject(waiting);
  definitionQueue.splice(0, definitionQueue.length);
  arrayables.splice(0, arrayables.length);
  setDefDefinitions();
});

setDefDefinitions();
