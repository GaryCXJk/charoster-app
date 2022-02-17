import { ipcRenderer } from 'electron';

export const ipcListeners = [
  'character-updated',
];

export const contextBridgePaths = {
  packs: {
    getPackList: () => ipcRenderer.invoke('packs:get-pack-list'),
    getImages: (type, imageId, filter = null) => ipcRenderer.invoke('packs:get-images', type, imageId, filter),
    getImageInfo: (type, imageId) => ipcRenderer.invoke('packs:get-image-info', type, imageId),
  },
  characters: {
    getCharacterList: (filterCharacter = null) => ipcRenderer.invoke('characters:get-character-list', filterCharacter),
    getCharacter: (characterId) => ipcRenderer.invoke('characters:get-character', characterId),
    getImages: (imageId, filter = null) => ipcRenderer.invoke('characters:get-images', imageId, filter),
  },
  definitions: {
    getDefinitionValue: (definitionId, valueId, field, fromPack = null) => ipcRenderer.invoke('definitions:get-definition-value', definitionId, valueId, field, fromPack),
  },
};
