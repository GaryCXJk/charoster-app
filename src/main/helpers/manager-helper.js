import { ipcMain } from "electron";
import { EventEmitter } from 'events';
import { notifyWindow } from "../managers/window-manager";

class ManagerEmitter extends EventEmitter {};

const managerEmitter = new ManagerEmitter();

export const onAppReset = (callback) => {
  managerEmitter.on('app-reset', callback);
}

const runAppReset = async () => {
  const listeners = managerEmitter.listeners('app-reset');
  await Promise.allSettled(listeners.map((listener) => Promise.resolve().then(() => listener())));
};

ipcMain.handle('app:reset', async () => {
  await runAppReset();
  notifyWindow('reset-all');
  return true;
});
