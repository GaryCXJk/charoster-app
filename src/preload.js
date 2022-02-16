import deepmerge from 'deepmerge';
import { contextBridge, ipcRenderer } from 'electron';
import params from './helpers/params';
import * as error from './preload/error';
import * as general from './preload/general';
import * as main from './preload/main';
import * as picker from './preload/picker';
import * as render from './preload/render';
import * as setup from './preload/setup';

const screens = {
  error,
  main,
  picker,
  render,
  setup,
};

let contextBridgePaths = deepmerge({}, general.contextBridgePaths);
if (screens[params.screen] && screens[params.screen].contextBridgePaths) {
  contextBridgePaths = deepmerge(contextBridgePaths, screens[params.screen].contextBridgePaths);
}

if (screens[params.screen] && screens[params.screen].ipcListeners) {
  const eventTarget = new EventTarget();

  const { ipcListeners } = screens[params.screen];

  ipcListeners.forEach((event) => {
    ipcRenderer.on(event, (_event, detail) => {
      const customEvent = new CustomEvent(event, {
        detail,
      });
      eventTarget.dispatchEvent(customEvent);
    });
  });
  contextBridgePaths = deepmerge(contextBridgePaths, {
    globalEventHandler: {
      on: (event, callback) => {
        eventTarget.addEventListener(event, (e) => {
          callback(e.detail);
        });
      },
    },
  });
}

Object.keys(contextBridgePaths).forEach((cbPath) => {
  const cbObj = contextBridgePaths[cbPath];

  contextBridge.exposeInMainWorld(cbPath, cbObj);
});
