import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import { IS_DEVELOPMENT } from '../global/constants';

const windowInstances = {};

class WindowEmitter extends EventEmitter {}

export const hasWindow = (id) => !!windowInstances[id];

export const createWindow = (id, options = {}) => {
  if (windowInstances[id]) {
    return false;
  }

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
    ...options
  });

  const emitter = new WindowEmitter();

  if (IS_DEVELOPMENT) {
    window.webContents.openDevTools({
      mode: 'undocked',
    });
  }

  window.loadURL(`${MAIN_WINDOW_WEBPACK_ENTRY}?screen=${id}`);

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
