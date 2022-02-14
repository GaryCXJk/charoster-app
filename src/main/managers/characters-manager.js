import * as path from 'path';
import deepmerge from 'deepmerge';
import Sharp from 'sharp';
import createWaiter from '@@helpers/create-waiter';
import { fetchEntities, loadEntity, queueEntity } from './file-manager';
import { queueFranchise } from './franchises-manager';
import { notifyWindow } from './window-manager';
import { ipcMain } from 'electron';
import { getConfig } from './config-manager';
import { getSize } from './designs-manager';

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
  charInfo.fullId = id;
  if (charInfo.franchise) {
    queueFranchise(charInfo.franchise);
  }
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
};

const loadCostume = async (costumeInfo) => {
  const parentId = costumeInfo.parent;
  await loadCharacter(parentId);
  if (waiting[parentId].status === 'rejected') {
    return null;
  }
  const parentInfo = characters[parentId];
  parentInfo.costumes.push(...costumeInfo.costumes);
  Object.assign(parentInfo.costumeMap, costumeInfo.costumeMap);

  return parentInfo;
};

const loadMeta = async (metaInfo) => {
  const parentId = metaInfo.parent;
  await loadCharacter(parentId);
  if (waiting[parentId].status === 'rejected') {
    return null;
  }
  const parentInfo = characters[parentId];
  Object.assign(parentInfo.meta, metaInfo.meta);

  return parentInfo;
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

export const getCostumeImages = async (imageId, filterSizes = null) => {
  if (imageCache[imageId]) {
    if (imageCache[imageId] instanceof Promise) {
      await imageCache[imageId];
    }
    if (imageCache[imageId] && filterSizes) {
      const filteredImages = {};
      filterSizes.forEach((filterSize) => {
        filteredImages[filterSize] = imageCache[imageId][filterSize] ?? imageCache[imageId].raw;
      })
      return filteredImages;
    }
    return imageCache[imageId];
  }
  const waiter = createWaiter();
  imageCache[imageId] = waiter;
  const [folder, characterId, costumeId, index] = imageId.split('>');
  const fullCostumeId = `${folder}>${characterId}>${costumeId}`;
  if (!costumes[fullCostumeId]) {
    await loadCharacter(`${folder}>${characterId}`);
  }
  const costume = costumes[fullCostumeId];
  if (!costume) {
    imageCache[imageId] = null;
    waiter.resolve();
    return null;
  }

  const imageInfo = costume.images[index];

  if (!imageInfo) {
    imageCache[imageId] = null;
    waiter.resolve();
    return null;
  }

  const image = (typeof imageInfo === 'string' ? imageInfo : imageInfo.image);

  const workFolder = getConfig('workFolder');
  const costumePath = path.join(workFolder, 'packs', folder, 'characters', characterId, costumeId, image);

  const sizes = ['raw', ...Object.keys(costume.sizes)];
  const foundImages = {};
  const returnImages = {};
  for (let idx = 0; idx < sizes.length; idx += 1) {
    const size = sizes[idx];
    const heightRatio = await getSize('characters', size);

    if (!heightRatio && size !== 'raw') {
      continue;
    }

    const sharpImage = new Sharp(costumePath);
    const sizeData = deepmerge({}, costume.sizes[size]);
    if (heightRatio) {
      sizeData.height = Math.round(sizeData.width / heightRatio);

      const sharpMeta = await sharpImage.metadata();

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
  imageCache[imageId] = foundImages;
  if (filterSizes) {
    filterSizes.forEach((filterSize) => {
      returnImages[filterSize] = imageCache[imageId][filterSize] ?? imageCache[imageId].raw;
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
