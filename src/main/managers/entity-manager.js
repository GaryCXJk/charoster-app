import { app, ipcMain } from 'electron';
import * as path from 'path';
import deepmerge from 'deepmerge';
import Sharp from 'sharp';
import { onAppReset } from '../helpers/manager-helper';
import { getConfig, getTempPath, setTempFile } from './config-manager';
import { checkArrayables } from './definitions-manager';
import * as fm from './file-manager';
import { getWorkspace } from './workspace-manager';
import { notifyWindow } from './window-manager';
import { getSize, getSizeKeys } from './designs-manager';
import { clearObject } from '../../helpers/object-helper';
import createWaiter from '../../helpers/create-waiter';
import { readFile, writeFile } from 'fs/promises';

const createEntityData = () => {
  return {
    instances: {},
    alts: {},
    queue: [],
    waiters: {},
    images: {},
    queueRunning: false,
  }
}

const entities = {};
const imageMap = {};
const entityTypes = [
  'characters',
  'stages',
  'items',
];

export const getEntityTypes = () => [...entityTypes];

export const fetchEntities = async (type, packFolder) => {
  return await fm.fetchEntities(type, packFolder);
}

const getEntityData = (type) => {
  entities[type] = entities[type] ?? createEntityData();
  return entities[type];
}

const prepareEntityData = (type, entityInfo, id) => {
  const [folder] = id.split('>');
  const entityData = getEntityData(type);
  entityInfo.fullId = id;
  entityInfo.pack = folder;
  if (entityInfo.images) {
    const { images: altList } = entityInfo;
    entityInfo.imageMap = {};
    entityInfo.images = altList.filter((alt) => alt.id).map((alt) => {
      alt.fullId = `${id}>${alt.id}`;
      entityData.alts[alt.fullId] = alt;
      entityInfo.imageMap[alt.fullId] = alt;
      return alt;
    });
  }
  const arrayables = checkArrayables(entityInfo);

  arrayables.forEach((key) => {
    if (entityInfo[key] && !Array.isArray(entityInfo[key])) {
      entityInfo[key] = [entityInfo[key]];
    }
  });
};

const loadIntoParent = async (type, entityInfo, callback) => {
  const entityData = getEntityData(type);
  const parentId = entityInfo.parent;
  await loadEntity(type, parentId);
  if (entityData.instances[parentId].status === 'rejected') {
    return null;
  }

  const parentInfo = entityData.instances[parentId];
  await callback(parentInfo);

  return parentInfo;
}

const loadAddon = async (type, entityInfo) => {
  return await loadIntoParent(type, entityInfo, async (parentInfo) => {
    if (entityInfo.images) {
      parentInfo.images.push(...entityInfo.images);
      Object.assign(parentInfo.imageMap, entityInfo.imageMap);
    }
    if (entityInfo.groups) {
      parentInfo.groups = parentInfo.groups ?? {};
      Object.assign(parentInfo.groups, entityInfo.groups);
    }

    if (entityInfo.meta) {
      Object.assign(parentInfo.meta, entityInfo.meta);
    }

    const props = checkArrayables(entityInfo);
    props.forEach((prop) => {
      if (!entityInfo[prop]) {
        return;
      }
      parentInfo[prop].push(...entityInfo[prop]);
    });
  });
}

const notifyEntityUpdated = (type, entityId) => {
  const entityData = getEntityData(type);
  const entity = entityData.instances[entityId] ? deepmerge({}, entityData.instances[entityId]) : null;
  notifyWindow('entity-updated', {
    type,
    entityId,
    entity,
  });
}

export const loadEntity = async (type, entityId) => {
  const entityData = getEntityData(type);
  return fm.loadEntity(type, entityData.waiters, entityData.instances, entityId, {
    processEntity: async (entityInfo) => {
      prepareEntityData(type, entityInfo, entityId);

      let returnInfo = entityInfo;

      switch (entityInfo.type) {
        case 'addon':
          returnInfo = await loadAddon(type, entityInfo);
          break;
        default:
          entityData.instances[entityId] = entityInfo;
          break;
      }

      entityData.waiters[entityId].resolve(entityInfo);
      notifyEntityUpdated(type, entityId);
      return returnInfo ? deepmerge({}, returnInfo) : null;
    },
    onProgressEntity: async () => {
      const waiter = entityData.waiters[entityId];
      await waiter;
      if (waiter === 'rejected') {
        return null;
      }
      switch (waiter.value.type) {
        case 'addon':
          return loadEntity(type, waiter.value.parent);
        default:
          notifyEntityUpdated(type, entityId);
          return entityData.instances[entityId];
      }
    }
  });
}

const runEntityQueue = async (type) => {
  const entityData = getEntityData(type);
  if (entityData.queueRunning) {
    return;
  }
  entityData.queueRunning = createWaiter();
  while (entityData.queue.length) {
    const entityId = entityData.queue.shift();
    await loadEntity(type, entityId);
  }
  entityData.queueRunning.resolve();
  entityData.queueRunning = null;
}

export const queueEntity = (type, entityId) => {
  const entityData = getEntityData(type);
  fm.queueEntity(entityData.queue, entityData.waiters, entityId);

  runEntityQueue(type);
}

export const awaitQueue = async (type, entityList = null) => {
  const entityData = getEntityData(type);
  if (entityList) {
    return Promise.allSettled(entityList.filter((item) => entityData.waiters[item]).map((item) => entityData.waiters[item]));
  }
  if (entityData.queueRunning) {
    await entityData.queueRunning;
  }
}

export const getEntityList = async (type, filterEntity = null) => {
  const entityData = getEntityData(type);
  if (filterEntity) {
    const entityList = {};

    for (let idx = 0; idx < filterEntity.length; idx += 1) {
      const entityId = filterEntity[idx];

      const entity = await loadEntity(type, entityId);

      if (entity) {
        entityList[entityId] = deepmerge({}, entity);
      }
    }
    return entityList;
  }
  return deepmerge({}, entityData.instances);
}

export const getAltImageInfo = async (type, imageId, fullData = false) => {
  const entityData = getEntityData(type);

  const [folder, entityId, altId, index] = imageId.split('>');
  const fullAltId = `${folder}>${entityId}>${altId}`;
  if (!entityData.alts[fullAltId]) {
    await loadEntity(type, `${folder}>${entityId}`);
  }
  const alt = entityData.alts[fullAltId];
  if (!alt) {
    return null;
  }
  if (fullData) {
    return alt;
  }

  return alt.images[index];
}

export const getAltImageUrls = (type, imageId, filterSizes = null, renderer = false) => {
  let sizes = ['raw', ...getSizeKeys(type)];
  if (filterSizes) {
    sizes = sizes.filter((size) => filterSizes.includes(size));
  }
  const maxRenderWidth = renderer ? 'max' : (getConfig('maxRenderWidth') ?? {})[type] ?? 'max';

  const foundImages = {};
  for (let idx = 0; idx < sizes.length; idx += 1) {
    const size = sizes[idx];
    const fileKey = `${type}/${imageId.replace(/\>/g, '/')}/${size}/${maxRenderWidth}`;
    if (!imageMap[fileKey]) {
      const time = (new Date()).getTime();
      const fakeFile = `${type}/${imageId.replace(/\>/g, '/')}/${size}/${maxRenderWidth}/${time}.webp`;
      imageMap[fileKey] = {
        file: fakeFile,
        time,
      };
    }
    const fileUrl = `${app.name}${renderer ? '-renderer' : ''}://${imageMap[fileKey].file}`;
    foundImages[size] = {
      file: fileUrl,
    };
  }

  return foundImages;
}

export const getAltImage = async (type, imageId, size, renderer = false) => {
  const entityData = getEntityData(type);
  const workspace = getWorkspace();
  const designId = workspace.rosters[workspace.displayRoster].theme ?? workspace.theme ?? null;
  const designKey = designId ?? '';
  const imageCache = entityData.images;
  if (!renderer) {
    let currentImageCache = imageCache[designKey]?.[imageId]?.[size];
    if (currentImageCache) {
      if (currentImageCache instanceof Promise) {
        await currentImageCache;
        currentImageCache = imageCache[designKey]?.[imageId]?.[size] ?? null;
      }
      if (typeof currentImageCache === 'string') {
        currentImageCache = await readFile(currentImageCache);
      }
      return currentImageCache;
    }
  }
  const waiter = createWaiter();
  if (!renderer) {
    imageCache[designKey] = imageCache[designKey] ?? {};
    imageCache[designKey][imageId] = imageCache[designKey][imageId] ?? {};
    imageCache[designKey][imageId][size] = waiter;
  }
  const [folder, entityId, altId, index] = imageId.split('>');
  const alt = await getAltImageInfo(type, imageId, true);

  if (!alt) {
    imageCache[designKey][imageId][size] = null;
    waiter.resolve();
    return null;
  }

  const imageInfo = alt.images[index];

  if (!imageInfo) {
    imageCache[designKey][imageId][size] = null;
    waiter.resolve();
    return null;
  }

  const image = (typeof imageInfo === 'string' ? imageInfo : imageInfo.image ?? imageInfo.file);

  const workFolder = getConfig('workFolder');
  const altPath = path.join(workFolder, 'packs', folder, type, entityId, altId, image);

  const heightRatio = await getSize(type, size, designId);

  const sharpImage = new Sharp(await readFile(altPath)); // We'll read from file buffer, to not lock up files in Windows.
  const sharpMeta = await sharpImage.metadata();
  let sizeData = alt.sizes && alt.sizes[size];
  if (imageInfo.sizes && imageInfo.sizes[size]) {
    sizeData = imageInfo.sizes[size];
  }

  if (!sizeData) {
    sizeData = {
      x: 0,
      y: 0,
      width: sharpMeta.width,
      height: heightRatio ? Math.round(sharpMeta.width / heightRatio) : sharpMeta.height,
    };
    if (sizeData.height > sharpMeta.height) {
      sizeData.width = Math.round(sharpMeta.height * heightRatio);
      sizeData.height = sharpMeta.height;
      sizeData.x = Math.floor((sharpMeta.width - sizeData.width) / 2);
    }
  } else {
    sizeData = deepmerge({}, sizeData);
  }

  if (heightRatio) {
    sizeData.height = Math.round(sizeData.width / heightRatio);

    if (sizeData.x < 0 || sizeData.y < 0 || sizeData.x + sizeData.width > sharpMeta.width || sizeData.y + sizeData.height > sharpMeta.height) {
      const newSize = {
        width: sharpMeta.width,
        height: sharpMeta.height,
      };

      const extendData = {
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0,
        },
      };

      if (sizeData.x < 0) {
        extendData.left = Math.abs(sizeData.x);
        sizeData.width -= extendData.left;
        sizeData.x = 0;
      }
      if (sizeData.y < 0) {
        extendData.top = Math.abs(sizeData.y);
        sizeData.height -= extendData.top;
        sizeData.y = 0;
      }
      if (sizeData.x + sizeData.width > newSize.width) {
        extendData.right = sizeData.x + sizeData.width - newSize.width;
        sizeData.width -= extendData.right;
      }
      if (sizeData.y + sizeData.height > newSize.height) {
        extendData.bottom = sizeData.y + sizeData.height - newSize.height;
        sizeData.height -= extendData.bottom;
      }

      await sharpImage.extend(extendData);
    }
  }

  await sharpImage
    .extract({
      left: sizeData.x,
      top: sizeData.y,
      width: sizeData.width,
      height: sizeData.height,
    })
    .webp({ lossless: true });

  const finalPass = new Sharp(await sharpImage.toBuffer());
  const fpMeta = await finalPass.metadata();

  const maxRenderWidth = getConfig('maxRenderWidth');
  if (!renderer && maxRenderWidth[type] && fpMeta.width > maxRenderWidth[type]) {
    await finalPass.resize({
      width: maxRenderWidth[type],
    });
  }
  await finalPass.webp({ lossless: true });

  const imageBuffer = await finalPass.toBuffer();

  if (renderer) {
    waiter.resolve();
    return imageBuffer;
  }

  try {
    const fileKey = `${type}/${imageId.replace(/\>/g, '/')}/${size}/${maxRenderWidth}`;
    if (!imageMap[fileKey]) {
      const time = (new Date()).getTime();
      const fakeFile = `${type}/${imageId.replace(/\>/g, '/')}/${size}/${maxRenderWidth}/${time}.webp`;
      imageMap[fileKey] = {
        file: fakeFile,
        time,
      };
    }
    const outFile = `${type}--${imageId.replace(/\>/g, '--')}--${size}--${maxRenderWidth[type]}--${imageMap[fileKey].time}.webp`;
    const writePath = path.join(getTempPath(), outFile);
    await writeFile(writePath, imageBuffer);
    setTempFile(outFile);
    imageCache[designKey][imageId][size] = writePath;
  } catch (_e) {
    imageCache[designKey][imageId][size] = imageBuffer;
  }

  waiter.resolve();
  return imageBuffer;
}

ipcMain.handle('entities:get-entity-list', (_event, type, filterEntity) => getEntityList(type, filterEntity));

ipcMain.handle('entities:get-entity', (_event, type, entityId) => {
  queueEntity(type, entityId);
  return loadEntity(type, entityId);
});

ipcMain.handle('entities:get-image-info', (_event, type, imageId) => getAltImageInfo(type, imageId));

ipcMain.on('entities:send-panel', (_event, entityId, imageId = null) => {
  notifyWindow('send-panel', {
    entityId,
    imageId,
  });
});

onAppReset(() => {
  clearObject(entities);
  clearObject(imageMap);
});
