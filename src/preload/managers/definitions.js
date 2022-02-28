import { ipcRenderer } from 'electron';

export const contextBridgePaths = {
  definitions: {
    getDefinition: (definitionId) => ipcRenderer.invoke('definitions:get-definition', definitionId),
    getDefinitionValue: (definitionId, valueId, field, fromPack = null) => ipcRenderer.invoke('definitions:get-definition-value', definitionId, valueId, field, fromPack),
  },
}
