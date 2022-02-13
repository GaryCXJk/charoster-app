import deepmerge from "deepmerge";
import { ipcMain } from "electron";
import { notifyWindow } from "../managers/window-manager";

let dragInfo = null;

ipcMain.on('drag-helper:on-start-drag', (_event, panelId, imageId = null) => {
  dragInfo = {
    panelId,
  };
  if (imageId) {
    dragInfo.imageId = imageId;
  }

  notifyWindow('drag-helper-info', deepmerge({}, dragInfo));
});

ipcMain.on('drag-helper:on-end-drag', () => {
  dragInfo = null;
  notifyWindow('drag-helper-done');
});
