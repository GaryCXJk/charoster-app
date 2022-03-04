import deepmerge from 'deepmerge';
import { ipcRenderer } from 'electron';
import * as entities from './managers/entities';
import * as definitions from './managers/definitions';

export const ipcListeners = [
  'character-updated',
  'entity-updated',
  'send-panel',
];

export const contextBridgePaths = deepmerge.all([
  {
    packs: {
      getPackList: () => ipcRenderer.invoke('packs:get-pack-list'),
      getImages: (type, imageId, filter = null) => ipcRenderer.invoke('packs:get-images', type, imageId, filter),
      getImageInfo: (type, imageId) => ipcRenderer.invoke('packs:get-image-info', type, imageId),
    },
    characters: {
      getCharacterList: (filterCharacter = null) => ipcRenderer.invoke('characters:get-character-list', filterCharacter),
      getCharacter: (characterId) => ipcRenderer.invoke('characters:get-character', characterId),
    },
  },
  entities.contextBridgePaths,
  definitions.contextBridgePaths,
]);
