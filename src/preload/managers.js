import { ipcRenderer } from 'electron';

export const ipcListeners = [
  'character-updated',
];

export const contextBridgePaths = {
  packs: {
    getPackList: () => ipcRenderer.invoke('packs:get-pack-list'),
    getImages: (type, imageId, filter = null) => ipcRenderer.invoke('packs:get-images', type, imageId, filter),
  },
  characters: {
    getCharacterList: (filterCharacter = null) => ipcRenderer.invoke('characters:get-character-list', filterCharacter),
    getCharacter: (characterId) => ipcRenderer.invoke('characters:get-character', characterId),
    getImages: (imageId, filter = null) => ipcRenderer.invoke('characters:get-images', imageId, filter),
  },
};
