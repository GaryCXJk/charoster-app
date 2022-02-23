import deepmerge from 'deepmerge';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { EventEmitter } from 'events';
import { IS_DEVELOPMENT } from '../../global/constants';
import createWaiter from '../../helpers/create-waiter';

const windowInstances = {};

class WindowEmitter extends EventEmitter {}

export const hasWindow = (id) => !!windowInstances[id];

export const createWindow = (id, options = {}) => {
  if (windowInstances[id]) {
    return false;
  }

  const {
    screen = null,
    showWindow = true,
    parent = null,
    ...browserWindowOptions
  } = options;

  const window = new BrowserWindow({
    title: 'ChaRoster',
    titleBarStyle: 'hidden',
    width: 800,
    height: 600,
    fullscreenable: false,
    show: false,
    parent: parent ? parent.window : null,
    ...browserWindowOptions,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      ...(browserWindowOptions.webPreferences ?? {})
    },
  });

  const emitter = new WindowEmitter();

  if (IS_DEVELOPMENT) {
    window.webContents.openDevTools({
      mode: 'undocked',
    });
  }

  window.loadURL(`${MAIN_WINDOW_WEBPACK_ENTRY}?id=${id}&screen=${screen ?? id}`);

  window.on('closed', () => {
    emitter.emit('closed');
    windowInstances[id] = null;
  });

  window.once('ready-to-show', async () => {
    emitter.emit('ready');
    if (showWindow) {
      if (parent && parent.window) {
        if (parent.window.isVisible()) {
          window.show();
          if (!window.getParentWindow()) {
            window.setParentWindow(parent.window);
          }
        }
        parent.emitter.once('shown', () => {
          window.show();
          if (!window.getParentWindow()) {
            window.setParentWindow(parent.window);
          }
        });
      } else {
        window.show();
      }
    }
    emitter.emit('shown');
  });

  window.webContents.on('devtools-opened', () => {
    window.focus()
    setImmediate(() => {
      window.focus()
    })
  });

  window.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  windowInstances[id] = {
    window,
    emitter,
  };

  return {
    window,
    emitter,
  };
};

export const getWindow = (id) => {
  if (hasWindow(id)) {
    return { ...windowInstances[id] };
  }
  return null;
}

export const notifyWindow = (message, payload = {}, id = null) => {
  if (!id) {
    Object.keys(windowInstances).forEach((windowId) => {
      notifyWindow(message, payload, windowId);
    });
  } else {
    const window = getWindow(id);

    if (window) {
      window.window.webContents.send(message, payload);
    }
  }
}

export const notifyWindowWithReply = async (message, payload = {}, id) => {
  const waiter = createWaiter();
  ipcMain.once(`${message}-reply`, (_event, ...reply) => {
    waiter.resolve(reply);
  });
  notifyWindow(message, payload, id);
  return await waiter;
}

ipcMain.handle('curwin:minimize', (_event, id) => {
  const window = getWindow(id);
  if (window) {
    window.window.minimize();
  }
});

ipcMain.handle('curwin:maximize', (_event, id) => {
  const window = getWindow(id);
  if (window) {
    if (!window.window.isMaximized()) {
      window.window.maximize();
    } else {
      window.window.unmaximize();
    }
  }
  return window.window.isMaximized();
});

ipcMain.handle('curwin:close', (_event, id) => {
  const window = getWindow(id);
  if (window) {
    window.window.setClosable(true);
    window.window.close();
    if (id === 'main') {
      app.quit();
    }
  }
});
