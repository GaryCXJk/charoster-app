import { ipcRenderer } from "electron";
import deepmerge from "deepmerge";
import * as definitions from './managers/definitions';
import * as entities from './managers/entities';

export const ipcListeners = [
  'set-selection',
];
export const contextBridgePaths = deepmerge.all([
  definitions.contextBridgePaths,
  entities.contextBridgePaths,
  {
    workspace: {
      create: () => ipcRenderer.invoke('workspace:new'),
      retrieve: () => ipcRenderer.invoke('workspace:retrieve'),
      update: (workspace) => ipcRenderer.invoke('workspace:update', workspace),
      save: (saveAs = false) => ipcRenderer.invoke('workspace:save', 'main', saveAs),
      load: () => ipcRenderer.invoke('workspace:load', 'main'),
      exportImage: (options = {}) => ipcRenderer.invoke('workspace:export-image', 'main', options),
    },
    designs: {
      getDropdown: () => ipcRenderer.invoke('designs:get-dropdown'),
    }
  }
]);
