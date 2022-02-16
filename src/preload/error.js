import { ipcRenderer } from 'electron';
import params from '../helpers/params';

export const contextBridgePaths = {
  errors: {
    getError: () => ipcRenderer.invoke('errors:get-error', params.id),
    showWindow: (height) => ipcRenderer.invoke('errors:show-error', params.id, height),
  }
};
