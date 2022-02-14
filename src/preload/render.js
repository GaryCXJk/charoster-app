import deepmerge from 'deepmerge';
import { ipcRenderer } from 'electron';
import * as managers from './managers';

export const ipcListeners = [
  ...managers.ipcListeners,
  'sync-workspace',
];
export const contextBridgePaths = deepmerge(managers.contextBridgePaths, {
  workspace: {
    create: () => ipcRenderer.invoke('workspace:new'),
    retrieve: () => ipcRenderer.invoke('workspace:retrieve'),
    update: (workspace) => ipcRenderer.invoke('workspace:update', workspace),
  },
  designs: {
    get: (designId = 'default') => ipcRenderer.invoke('designs:get', designId),
  },
});
