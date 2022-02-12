import deepmerge from 'deepmerge';
import * as managers from './managers';

export const ipcListeners = [...managers.ipcListeners];
export const contextBridgePaths = deepmerge({}, managers.contextBridgePaths, {});
