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
  },
  entities: {
    getEntityList: (type, filterEntity = null) => ipcRenderer.invoke('entities:get-entity-list', type, filterEntity),
    getEntity: (type, entityId) => ipcRenderer.invoke('entities:get-entity', type, entityId),
  },
  definitions: {
    getDefinitionValue: (definitionId, valueId, field, fromPack = null) => ipcRenderer.invoke('definitions:get-definition-value', definitionId, valueId, field, fromPack),
  },
};
