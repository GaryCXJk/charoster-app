import { ipcRenderer } from 'electron';
import params from '@@helpers/params';

export const ipcListeners = [
  'darkmode-switched',
  'reset-all',
  'sync-workspace',
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
    get: (key = null) => ipcRenderer.invoke('config:get', key),
    pickFolder: (choice) => ipcRenderer.invoke('config:pick-folder', params.id, choice),
    getWindowSize: () => ipcRenderer.invoke('config:get-window-size'),
    setWindowSize: (width, height) => ipcRenderer.invoke('config:set-window-size', width, height),
    setDarkMode: (mode) => ipcRenderer.invoke('config:set-dark-mode', mode),
  },
};
