import deepmerge from 'deepmerge';
import { contextBridge, ipcRenderer } from 'electron';
import createWaiter from './helpers/create-waiter';
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
  ipcListeners.unshift(...general.ipcListeners);

  ipcListeners.forEach((event) => {
    ipcRenderer.on(event, async (evt, detail = null) => {
      const waiter = createWaiter();
      const customEvent = new CustomEvent(event, {
        detail: {
          detail,
          waiter,
        }
      });
      eventTarget.dispatchEvent(customEvent);
      const resolved = await waiter;
      evt.sender.send(`${event}-reply`, resolved);
    });
  });
  contextBridgePaths = deepmerge(contextBridgePaths, {
    globalEventHandler: {
      on: (event, callback) => {
        eventTarget.addEventListener(event, (e) => {
          e.detail.waiter.resolve(callback(e.detail.detail));
        });
      },
    },
  });
}

Object.keys(contextBridgePaths).forEach((cbPath) => {
  const cbObj = contextBridgePaths[cbPath];

  contextBridge.exposeInMainWorld(cbPath, cbObj);
});
