import { BrowserWindow, ipcMain } from 'electron';
import { EventEmitter } from 'events';
import { IS_DEVELOPMENT } from '../../global/constants';

const windowInstances = {};

class WindowEmitter extends EventEmitter {}

export const hasWindow = (id) => !!windowInstances[id];

export const createWindow = (id, options = {}) => {
  if (windowInstances[id]) {
    return false;
  }

  const {
    screen = null,
    ...browserWindowOptions
  } = options;

  const window = new BrowserWindow({
    title: 'ChaRoster',
    titleBarStyle: 'hidden',
    width: 800,
    height: 600,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    show: false,
    ...browserWindowOptions
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
  })

  window.once('ready-to-show', () => {
    emitter.emit('ready');
    window.show();
  });

  window.webContents.on('devtools-opened', () => {
    window.focus()
    setImmediate(() => {
      window.focus()
    })
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
  }
});
