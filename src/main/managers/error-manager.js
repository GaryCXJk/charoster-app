import { ipcMain } from "electron";
import createWaiter from "../../helpers/create-waiter";
import { createWindow, getWindow } from "./window-manager"

let errorMessages = 1;
const messages = {};
const canShow = {};

export const showError = (message, id = 'main') => {
  const window = getWindow(id);

  const errorId = `error${errorMessages}`;
  errorMessages += 1;
  canShow[errorId] = createWaiter();

  const error = createWindow(errorId, {
    width: 400,
    height: 300,
    screen: 'error',
    parent: window,
    modal: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
  });

  messages[errorId] = message;

  window.emitter.once('ready', () => {
    canShow[errorId].resolve();
  });
}

ipcMain.handle('errors:get-error', async (_event, errorId) => {
  return canShow[errorId].then(() => messages[errorId]);
});

ipcMain.handle('errors:show-error', (_event, errorId, height) => {
  const window = getWindow(errorId);
  window.window.setResizable(true);
  window.window.setSize(400, height);
  window.window.setResizable(false);
  window.window.show();
});
