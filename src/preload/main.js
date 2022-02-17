import deepmerge from 'deepmerge';
import { ipcRenderer } from 'electron';
import * as managers from './managers';

export const ipcListeners = [
  ...managers.ipcListeners,
  'drag-helper-info',
  'drag-helper-done',
];
export const contextBridgePaths = deepmerge(managers.contextBridgePaths, {
  workspace: {
    create: () => ipcRenderer.invoke('workspace:new'),
    retrieve: () => ipcRenderer.invoke('workspace:retrieve'),
    update: (workspace) => ipcRenderer.invoke('workspace:update', workspace),
    save: (saveAs = false) => ipcRenderer.invoke('workspace:save', 'main', saveAs),
    load: () => ipcRenderer.invoke('workspace:load', 'main'),
    exportImage: () => ipcRenderer.invoke('workspace:export-image', 'main'),
  },
  designs: {
    get: (designId = null) => ipcRenderer.invoke('designs:get', designId),
  },
  app: {
    reset: () => ipcRenderer.invoke('app:reset'),
  }
});
