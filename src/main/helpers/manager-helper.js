import { ipcMain } from "electron";
import { EventEmitter } from 'events';
import { notifyWindow } from "../managers/window-manager";

class ManagerEmitter extends EventEmitter {};

const managerEmitter = new ManagerEmitter();

export const onAppReset = (callback) => {
  managerEmitter.on('app-reset', callback);
}

ipcMain.handle('app:reset', () => {
  managerEmitter.emit('app-reset');
  notifyWindow('reset-all');
});
