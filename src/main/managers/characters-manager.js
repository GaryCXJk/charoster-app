import * as path from 'path';
import deepmerge from 'deepmerge';
import Sharp from 'sharp';
import createWaiter from '@@helpers/create-waiter';
import { fetchEntities, loadEntity, queueEntity } from './file-manager';
import { notifyWindow } from './window-manager';
import { ipcMain } from 'electron';
import { getConfig } from './config-manager';
import { getSize, getSizeKeys } from './designs-manager';
import { getWorkspace } from './workspace-manager';
import { checkArrayables } from './definitions-manager';
import { onAppReset } from '../helpers/manager-helper';
import { clearObject } from '../../helpers/object-helper';

const characters = {};
const costumes = {};
const characterQueue = [];
const waiting = {};
const imageCache = {};

let queueIsRunning = null;

export const fetchCharacters = async (packFolder) => {
  return await fetchEntities('characters', packFolder);
}

const prepareCharacterData = (charInfo, id) => {
  const [folder] = id.split('>');
  charInfo.fullId = id;
  charInfo.pack = folder;
  if (charInfo.costumes) {
    const { costumes: costumeList } = charInfo;
    charInfo.costumeMap = {};
    charInfo.costumes = costumeList.filter((costume) => costume.id).map((costume) => {
      costume.fullId = `${id}>${costume.id}`;
      costumes[costume.fullId] = costume;
      charInfo.costumeMap[costume.fullId] = costume;
      return costume;
    });
  }
  const arrayables = checkArrayables(charInfo);

  arrayables.forEach((key) => {
    if (charInfo[key] && !Array.isArray(charInfo[key])) {
      charInfo[key] = [charInfo[key]];
    }
  });
};

const loadIntoParent = async (characterInfo, callback) => {
  const parentId = characterInfo.parent;
  await loadCharacter(parentId);
  if (waiting[parentId].status === 'rejected') {
    return null;
  }

  const parentInfo = characters[parentId];
  await callback(parentInfo);

  return parentInfo;
}

const loadAddon = async (characterInfo) => {
  return await loadIntoParent(characterInfo, async (parentInfo) => {
    if (characterInfo.costumes) {
      parentInfo.costumes.push(...characterInfo.costumes);
      Object.assign(parentInfo.costumeMap, characterInfo.costumeMap);
    }

    if (characterInfo.meta) {
      Object.assign(parentInfo.meta, characterInfo.meta);
    }

    const props = checkArrayables(characterInfo);
    props.forEach((prop) => {
      if (!characterInfo[prop]) {
        return;
      }
      parentInfo[prop].push(...characterInfo[prop]);
    });
  });
}

const loadCostume = async (costumeInfo) => {
  return await loadIntoParent(costumeInfo, async (parentInfo) => {
    parentInfo.costumes.push(...costumeInfo.costumes);
    Object.assign(parentInfo.costumeMap, costumeInfo.costumeMap);
    if (costumeInfo.groups) {
      parentInfo.groups = parentInfo.groups ?? {};
      Object.assign(parentInfo.groups, costumeInfo.groups);
    }
  });
};

const loadMeta = async (metaInfo) => {
  return await loadIntoParent(metaInfo, async (parentInfo) => {
    Object.assign(parentInfo.meta, metaInfo.meta);
  });
};

const notifyCharacterUpdated = (characterId) => {
  const character = characters[characterId] ? deepmerge({}, characters[characterId]) : null;
  notifyWindow('character-updated', {
    characterId,
    character,
  });
}

const loadCharacter = async (characterId) => {
  return loadEntity('characters', waiting, characters, characterId, {
    processEntity: async (charInfo) => {
      prepareCharacterData(charInfo, characterId);

      let returnInfo = charInfo;

      switch (charInfo.type) {
        case 'addon':
          returnInfo = await loadAddon(charInfo);
          break;
        case 'costume':
          returnInfo = await loadCostume(charInfo);
          break;
        case 'meta':
          returnInfo = await loadMeta(charInfo);
          break;
        default:
          characters[characterId] = charInfo;
          break;
      }

      waiting[characterId].resolve(charInfo);
      notifyCharacterUpdated(characterId);
      return returnInfo ? deepmerge({}, returnInfo) : null;
    },
    onProgressEntity: async () => {
      const waiter = waiting[characterId];
      await waiter;
      if (waiter === 'rejected') {
        return null;
      }
      switch (waiter.value.type) {
        case 'costume':
        case 'meta':
          return loadCharacter(waiter.value.parent);
        default:
          notifyCharacterUpdated(characterId);
          return characters[characterId];
      }
    }
  });
}

const runCharacterQueue = async () => {
  if (queueIsRunning) {
    return;
  }
  queueIsRunning = createWaiter();
  while (characterQueue.length) {
    const characterId = characterQueue.shift();
    await loadCharacter(characterId);
  }
  queueIsRunning.resolve();
  queueIsRunning = null;
}

export const queueCharacter = (characterId) => {
  queueEntity(characterQueue, waiting, characterId);

  runCharacterQueue();
}

export const awaitCharacterQueue = async (characterList = null) => {
  if (characterList) {
    return Promise.allSettled(characterList.filter((item) => waiting[item]).map((item) => waiting[item]));
  }
  if (queueIsRunning) {
    await queueIsRunning;
  }
}

export const getCharacterList = async (filterCharacter = null) => {
  if (filterCharacter) {
    const characterList = {};

    for (let idx = 0; idx < filterCharacter.length; idx += 1) {
      const charId = filterCharacter[idx];

      const char = await loadCharacter(charId);

      if (char) {
        characterList[charId] = deepmerge({}, char);
      }
    }
    return characterList;
  }
  return deepmerge({}, characters);
}

export const getCostumeImageInfo = async (imageId) => {
  const [folder, characterId, costumeId, index] = imageId.split('>');
  const fullCostumeId = `${folder}>${characterId}>${costumeId}`;
  if (!costumes[fullCostumeId]) {
    await loadCharacter(`${folder}>${characterId}`);
  }
  const costume = costumes[fullCostumeId];
  if (!costume) {
    return null;
  }

  return costume.images[index];
}

export const getCostumeImages = async (imageId, filterSizes = null) => {
  const workspace = getWorkspace();
  const designId = workspace.rosters[workspace.displayRoster].theme ?? workspace.theme ?? null;
  const designKey = designId ?? '';
  let currentImageCache = imageCache[designKey]?.[imageId];
  if (currentImageCache) {
    if (currentImageCache instanceof Promise) {
      await currentImageCache;
      currentImageCache = imageCache[designKey]?.[imageId] ?? null;
    }
    if (currentImageCache && filterSizes) {
      const filteredImages = {};
      filterSizes.forEach((filterSize) => {
        filteredImages[filterSize] = currentImageCache[filterSize] ?? currentImageCache.raw;
      })
      return filteredImages;
    }
    return currentImageCache;
  }
  const waiter = createWaiter();
  imageCache[designKey] = imageCache[designKey] ?? {};
  imageCache[designKey][imageId] = waiter;
  const [folder, characterId, costumeId, index] = imageId.split('>');
  const fullCostumeId = `${folder}>${characterId}>${costumeId}`;
  if (!costumes[fullCostumeId]) {
    await loadCharacter(`${folder}>${characterId}`);
  }
  const costume = costumes[fullCostumeId];
  if (!costume) {
    imageCache[designKey][imageId] = null;
    waiter.resolve();
    return null;
  }

  const imageInfo = costume.images[index];

  if (!imageInfo) {
    imageCache[designKey][imageId] = null;
    waiter.resolve();
    return null;
  }

  const image = (typeof imageInfo === 'string' ? imageInfo : imageInfo.image ?? imageInfo.file);

  const workFolder = getConfig('workFolder');
  const costumePath = path.join(workFolder, 'packs', folder, 'characters', characterId, costumeId, image);

  const sizes = ['raw', ...getSizeKeys('characters')];
  const foundImages = {};
  const returnImages = {};
  for (let idx = 0; idx < sizes.length; idx += 1) {
    const size = sizes[idx];
    const heightRatio = await getSize('characters', size, designId);

    if (!heightRatio && size !== 'raw') {
      continue;
    }

    const sharpImage = new Sharp(costumePath);
    const sharpMeta = await sharpImage.metadata();
    let sizeData = costume.sizes && costume.sizes[size];
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
      });

    const buffer = await sharpImage
      .png()
      .toBuffer();

    foundImages[size] = {
      buffer,
      data: `data:image/png;base64,${buffer.toString('base64')}`,
    };
  }
  imageCache[designKey][imageId] = foundImages;
  if (filterSizes) {
    filterSizes.forEach((filterSize) => {
      returnImages[filterSize] = imageCache[designKey][imageId][filterSize] ?? imageCache[designKey][imageId].raw;
    })
  }
  waiter.resolve();
  return returnImages;
}

ipcMain.handle('characters:get-character-list', (_event, filterCharacter) => getCharacterList(filterCharacter));

ipcMain.handle('characters:get-character', (_event, characterId) => {
  queueCharacter(characterId);
  return loadCharacter(characterId);
});

ipcMain.handle('characters:get-images', (_event, imageId, filter = null) => getCostumeImages(imageId, filter));
ipcMain.handle('characters:get-image-info', (_event, imageId) => getCostumeImageInfo(imageId));

onAppReset(() => {
  queueIsRunning = null;
  characterQueue.splice(0, characterQueue.length);
  clearObject(characters);
  clearObject(costumes);
  clearObject(waiting);
  clearObject(imageCache);
});
