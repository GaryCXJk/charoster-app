import { ipcRenderer } from 'electron';

export const ipcListeners = [
  'character-updated',
];

export const contextBridgePaths = {
  packs: {
    getPackList: () => ipcRenderer.invoke('packs:get-pack-list'),
  },
  characters: {
    getCharacterList: (filterCharacter = null) => ipcRenderer.invoke('characters:get-character-list', filterCharacter),
    getImages: (imageId) => ipcRenderer.invoke('characters:get-images', imageId),
  },
};
