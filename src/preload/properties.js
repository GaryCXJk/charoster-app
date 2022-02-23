import { ipcRenderer } from "electron";

export const ipcListeners = [];
export const contextBridgePaths = {
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
};
