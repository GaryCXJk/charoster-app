import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('darkMode', {
  check: () => ipcRenderer.invoke('dark-mode:check'),
  toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
  system: () => ipcRenderer.invoke('dark-mode:system'),
});

contextBridge.exposeInMainWorld('config', {
  getWorkFolder: (override) => ipcRenderer.invoke('config:get-workfolder', override),
  pickFolder: (choice) => ipcRenderer.invoke('config:pick-folder', choice),
});
