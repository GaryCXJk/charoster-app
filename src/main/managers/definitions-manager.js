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

const images = {};
const definitions = {};
const definitionNotifier = {};
const definitionEntities = {};
const definitionFiles = {};
const definitionQueue = [];
const waiting = {};
const arrayables = [];

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
  if (!entity[field] && !entity.meta?.[field]) {
    return null;
  }
  let type = 'string';
  if (field === 'meta') {
    type = 'object';
  }
  if (definition.fields?.[field]) {
    type = definition.fields[field];
  }
  return await processEntity(type, entity[field] ?? entity.meta?.[field], definition);
};

const preprocessValues = (definition, packId, entityId, data) => {
  const fullEntityId = `${packId}>${entityId}`;
  Object.keys(definition.fields).forEach((field) => {
    if (!data[field]) {
      return;
    }
    const type = definition.fields[field];
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

export const addDefinition = (packId, definition) => {
  const id = (definition.namespace ?? true) ? `${definition.namespace ?? packId}:${definition.id}` : definition.id;
  definitions[id] = definitions[id] ?? {
    packs: [],
  };
  const packs = definitions[id].packs;
  definitions[id] = deepmerge(definitions[id], definition);
  packs.push(packId);
  definitions[id].packs = packs;
  definitionNotifier[id] = definitionNotifier[id] ?? createWaiter();
  definitionNotifier[id].resolve();
  if (definitions[id].list && !arrayables.includes(id)) {
    arrayables.push(id);
  }
  discoverDefinitionEntities(packId, id).then(async () => {
    if (queueIsRunning) {
      await queueIsRunning;
    }
  });
}

export const getDefinition = async (id) => {
  definitionNotifier[id] = definitionNotifier[id] ?? createWaiter();
  await definitionNotifier[id];
  return definitions[id];
}

ipcMain.handle('definitions:get-definition-value', async (_event, definitionId, valueIds, field) => {
  const values = !Array.isArray(valueIds) ? [valueIds] : valueIds;

  const ret = [];

  for (let idx = 0; idx < values.length; idx += 1) {
    const val = values[idx];
    const outVal = await getDefinitionEntityValue(definitionId, val.split('>'), field);
    ret.push(outVal);
  }
  const definition = definitions[definitionId];
  if (definition.list) {
    return ret;
  }
  return ret[0];
});
