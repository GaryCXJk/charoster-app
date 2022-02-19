import deepmerge from 'deepmerge';
import { ipcMain } from 'electron';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import createWaiter from '../../helpers/create-waiter';
import { onAppReset } from '../helpers/manager-helper';
import { awaitCharacterQueue, fetchCharacters, getCostumeImageInfo, getCostumeImages, queueCharacter } from './characters-manager';
import { getConfig, waitForWorkFolder } from './config-manager';
import { addDefinition, autoDiscoverDefinitions } from './definitions-manager';
import { fetchDesigns, getDesignImage, queueDesign } from './designs-manager';
import { notifyWindow } from './window-manager';

const { readdir, readFile, stat } = fsPromises;

let packDiscoveryPromise = createWaiter();

export const awaitPackDiscovery = async () => await packDiscoveryPromise;

const imageReaders = {
  characters: getCostumeImages,
  designs: getDesignImage,
};
const imageInfoReaders = {
  characters: getCostumeImageInfo,
};

const packs = {};

const setPackDefinitions = (pack) => {
  const defUpdates = [];
  if (pack.definitions) {
    pack.definitions.forEach((definition) => {
      defUpdates.push(addDefinition(pack.id, definition));
    });
  }
  return defUpdates;
}

export const fetchPack = async (folder) => {
  const workFolder = getConfig('workFolder');

  const packPath = path.join(workFolder, 'packs', folder);
  const packInfoPath = path.join(packPath, 'info.json');

  try {
    const packInfoStr = await readFile(packInfoPath, {
      encoding: 'utf-8',
    });

    const packInfo = JSON.parse(packInfoStr);

    packInfo.status = 'loading';
    packs[packInfo.id ?? folder] = packInfo;

    notifyWindow('pack-loading', deepmerge({}, packInfo));

    // Fetch characters.
    if (packInfo.characters) {
      const characters = await fetchCharacters(folder);

      if (characters.length) {
        characters.forEach((characterId) => {
          queueCharacter(characterId);
        });

        awaitCharacterQueue(characters).then((values) => {
          packInfo.characters = [];
          const addons = [];
          values.forEach((value) => {
            if (value.value.type === 'character') {
              packInfo.characters.push(value.value.fullId);
            } else {
              addons.push(`characters>${value.value.type}:${value.value.fullId}`);
            }
          });
          if (addons.length) {
            packInfo.addons = addons;
          }
          notifyWindow('pack-character-list-ready', {
            packId: packInfo.id,
            characters: packInfo.characters,
          });
        }).catch(() => {
          // Do nothing
        });
      } else {
        packInfo.characters = false;
      }
    }
    if (packInfo.designs) {
      const designs = await fetchDesigns(folder);

      if (designs.length) {
        designs.forEach((designId) => {
          queueDesign(designId);
        });

        packInfo.designs = designs;
      }
    }
    const ignore = setPackDefinitions(packInfo);
    autoDiscoverDefinitions(packInfo.id ?? folder, packInfo, ignore);

    packInfo.status = 'ready';

    return packInfo;
  } catch (_e) {
    // console.log(_e);
    // Do nothing
  }
  return null;
}

export const discoverPacks = async () => {
  await waitForWorkFolder();
  const files = [];
  const workFolder = path.join(getConfig('workFolder'), 'packs');

  try {
    const foundFiles = await readdir(workFolder);

    for (let idx = 0; idx < foundFiles.length; idx += 1) {
      const file = foundFiles[idx];
      try {
        const fileStats = await stat(path.join(workFolder, file));
        if (fileStats.isDirectory()) {
          files.push(file);
        }
      } catch(_e) {
        // Do nothing
      }
    }
  } catch(_e) {
    // Do nothing
  }
  for (let idx = 0; idx < files.length; idx+= 1) {
    const file = files[idx];
    const pack = await fetchPack(file);
    if (pack) {
      const packCopy = deepmerge({}, pack);
      notifyWindow('pack-ready', packCopy);
    }
  }
  packDiscoveryPromise.resolve();
}

export const getPackList = () => {
  return deepmerge({}, packs);
}

ipcMain.handle('packs:get-pack-list', getPackList);

ipcMain.handle('packs:get-images', (_event, type, imageId, filter = null) => {
  if (!imageReaders[type]) {
    return null;
  }

  return imageReaders[type](imageId, filter);
});

ipcMain.handle('packs:get-image-info', (_event, type, imageId) => {
  if (!imageInfoReaders[type]) {
    return null;
  }

  return imageInfoReaders[type](imageId);
});

onAppReset(() => {
  packDiscoveryPromise = createWaiter();
  Object.keys(packs).forEach((packId) => {
    delete packs[packId];
  });
  discoverPacks();
});
