import { ipcRenderer } from 'electron';

export const contextBridgePaths = {
  entities: {
    getEntityList: (type, filterEntity = null) => ipcRenderer.invoke('entities:get-entity-list', type, filterEntity),
    getEntity: (type, entityId) => ipcRenderer.invoke('entities:get-entity', type, entityId),
  },
}
