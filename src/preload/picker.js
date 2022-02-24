import deepmerge from 'deepmerge';
import { ipcRenderer } from 'electron';
import * as managers from './managers';

export const ipcListeners = [
  ...managers.ipcListeners,
  'pack-ready',
  'pack-character-list-ready',
  'pack-entity-list-ready',
];

export const contextBridgePaths = deepmerge(managers.contextBridgePaths, {
  workspace: {
    retrieve: () => ipcRenderer.invoke('workspace:retrieve'),
  },
  panels: {
    startDrag: (id, imageId = null) => ipcRenderer.send('drag-helper:on-start-drag', id, imageId),
    endDrag: () => ipcRenderer.send('drag-helper:on-end-drag'),
  },
});
