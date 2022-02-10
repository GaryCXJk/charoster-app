import { contextBridge, ipcRenderer } from 'electron';
import params from './helpers/params';

contextBridge.exposeInMainWorld('curWin', {
  minimize: () => ipcRenderer.invoke('curwin:minimize', params.id),
  maximize: () => ipcRenderer.invoke('curwin:maximize', params.id),
  close: () => ipcRenderer.invoke('curwin:close', params.id),
});

contextBridge.exposeInMainWorld('darkMode', {
  check: () => ipcRenderer.invoke('dark-mode:check'),
  toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
  system: () => ipcRenderer.invoke('dark-mode:system'),
});

const config = {
  pickFolder: (choice) => ipcRenderer.invoke('config:pick-folder', choice),
};

switch (params.screen) {
  case 'setup':
    Object.assign(config, {
      getWorkFolder: (override) => ipcRenderer.invoke('config:get-workfolder', override),
      setWorkFolder: (data) => ipcRenderer.invoke('config:set-workfolder', data),
    });
    break;
  default:
    break;
}

contextBridge.exposeInMainWorld('config', config);
