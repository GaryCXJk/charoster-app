import { ipcRenderer } from 'electron';
import params from '@@helpers/params';

export const ipcListeners = [
  'reset-all',
];

export const contextBridgePaths = {
  curWin: {
    minimize: () => ipcRenderer.invoke('curwin:minimize', params.id),
    maximize: () => ipcRenderer.invoke('curwin:maximize', params.id),
    close: () => ipcRenderer.invoke('curwin:close', params.id),
  },
  darkMode: {
    check: () => ipcRenderer.invoke('dark-mode:check'),
    toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
    system: () => ipcRenderer.invoke('dark-mode:system'),
  },
  config: {
    pickFolder: (choice) => ipcRenderer.invoke('config:pick-folder', params.id, choice),
  },
};
