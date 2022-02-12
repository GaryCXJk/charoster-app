import { ipcRenderer } from 'electron';

export const contextBridgePaths = {
  config: {
    getWorkFolder: (override) => ipcRenderer.invoke('config:get-workfolder', override),
    setWorkFolder: (data) => ipcRenderer.invoke('config:set-workfolder', data),
  }
};
