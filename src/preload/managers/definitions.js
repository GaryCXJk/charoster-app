import { ipcRenderer } from 'electron';

export const contextBridgePaths = {
  definitions: {
    getDefinition: (definitionId) => ipcRenderer.invoke('definitions:get-definition', definitionId),
    getDefinitionValue: (definitionId, valueId, field, fromPack = null, returnEntity = false) => ipcRenderer.invoke('definitions:get-definition-value', definitionId, valueId, field, fromPack, returnEntity),
    getDefinitionEntity: (definitionId, field, value) => ipcRenderer.invoke('definitions:get-definition-entity', definitionId, field, value),
    getEntityFields: () => ipcRenderer.invoke('definitions:get-entity-fields'),
  },
}
