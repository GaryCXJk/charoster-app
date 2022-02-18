import { ipcMain } from 'electron';
import { awaitQueue, fetchEntities, getAltImageInfo, getAltImages, getEntityList, loadEntity, queueEntity } from './entity-manager';

export const fetchCharacters = async (packFolder) => {
  return await fetchEntities('characters', packFolder);
}

const loadCharacter = async (characterId) => {
  return await loadEntity('characters', characterId);
}

export const queueCharacter = (characterId) => {
  queueEntity('characters', characterId);
}

export const awaitCharacterQueue = (characterList = null) => {
  return awaitQueue('characters', characterList);
}

export const getCharacterList = async (filterCharacter = null) => {
  return await getEntityList('characters', filterCharacter);
}

export const getCostumeImageInfo = async (imageId) => {
  return await getAltImageInfo('characters', imageId);
}

export const getCostumeImages = async (imageId, filterSizes = null) => {
  return await getAltImages('characters', imageId, filterSizes);
}

ipcMain.handle('characters:get-character-list', (_event, filterCharacter) => getCharacterList(filterCharacter));

ipcMain.handle('characters:get-character', (_event, characterId) => {
  queueCharacter(characterId);
  return loadCharacter(characterId);
});

ipcMain.handle('characters:get-images', (_event, imageId, filter = null) => getCostumeImages(imageId, filter));
ipcMain.handle('characters:get-image-info', (_event, imageId) => getCostumeImageInfo(imageId));
