import deepmerge from 'deepmerge';
import { ipcRenderer } from 'electron';
import * as managers from './managers';

export const ipcListeners = [
  ...managers.ipcListeners,
  'sync-workspace',
  'request-credits-size',
  'cleanup-credits',
];
export const contextBridgePaths = deepmerge(managers.contextBridgePaths, {
  workspace: {
    create: () => ipcRenderer.invoke('workspace:new'),
    retrieve: () => ipcRenderer.invoke('workspace:retrieve'),
    update: (workspace) => ipcRenderer.invoke('workspace:update', workspace),
  },
  packs: {
    getImages: (type, imageId, filter = null) => ipcRenderer.invoke('packs:get-images', type, imageId, filter, true),
  },
  entities: {
    getImages: (imageId, filter = null) => ipcRenderer.invoke('entities:get-images', imageId, filter, true),
  },
  designs: {
    get: (designId = 'default') => ipcRenderer.invoke('designs:get', designId),
  },
});
