import { app, protocol, screen } from 'electron';
import * as path from 'path';
import { debounce } from 'throttle-debounce';
import { hasWindow, createWindow } from './managers/window-manager';
import { executeOnConfigLoad, getConfig, getTempPath, removeTempFilesSync, setConfig } from './managers/config-manager';
import { discoverPacks } from './managers/packs-manager';
import './managers/workspace-manager';
import './helpers/drag-helper';
import { getAltImage } from './managers/entity-manager';
import { getFileBuffer } from './managers/file-manager';

let mainWindow;
let pickerWindow;
let propertiesWindow;
let renderWindow;

protocol.registerSchemesAsPrivileged([
  { scheme: 'blob', privileges: { bypassCSP: true } },
  { scheme: app.name, privileges: { bypassCSP: true }},
  { scheme: `${app.name}-renderer`, privileges: { bypassCSP: true }},
]);

app.commandLine.appendSwitch ("disable-http-cache");

const disableF4 = (window) => {
  window.webContents.on('before-input-event', (event, input) => {
    if (input.code === 'F4' && input.alt) {
      event.preventDefault();
    }
  });
}

// quit application when all windows are closed
app.on('window-all-closed', () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    removeTempFilesSync();
    app.quit()
  }
});

app.on('activate', () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (hasWindow('main')) {
    createWindow('main');
  }
});

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  protocol.interceptBufferProtocol(app.name, async (request, callback) => {
    const url = request.url.slice(app.name.length + 3);
    const match = url.match(/^([\w\d\-]+?)\/([\w\d\-\/]+)\/([\w\d\-]+)\.png$/);
    if (!match) {
      const file = path.join(getTempPath(), url.replace(/\//g, '--'));
      const buffer = getFileBuffer(file);
      if (!buffer) {
        callback({ error: 404 });
      }
      callback({ mimeType: 'image/png', data: buffer });
    }

    let buffer;
    try {
      buffer = await getAltImage(match[1], match[2].replace(/\//g, '>'), match[3], true);
    } catch (e) {
      console.log(e);
    }
    if (!buffer) {
      callback({ error: 404 });
    }
    callback({ mimeType: 'image/png', data: buffer });
  });
  protocol.interceptBufferProtocol(`${app.name}-renderer`, async (request, callback) => {
    const url = request.url.slice(app.name.length + 12);
    const match = url.match(/^([\w\d\-]+?)\/([\w\d\-\/]+)\/([\w\d\-]+)\.png$/);
    if (!match) {
      callback({ error: 404 });
    }
    let buffer;
    try {
      buffer = await getAltImage(match[1], match[2].replace(/\//g, '>'), match[3], true);
    } catch (e) {
      console.log(e);
    }
    if (!buffer) {
      callback({ error: 404 });
    }
    callback({ mimeType: 'image/png', data: buffer });
  });
  executeOnConfigLoad(() => {
    discoverPacks();
    const { width, height, fullscreen } = getConfig('windowSize');
    mainWindow = createWindow('main', {
      width,
      height,
      ...(fullscreen ? { fullscreen } : {}),
      minWidth: 800,
      minHeight: 600,
      fullscreenable: true,
    });

    renderWindow = createWindow('render', {
      width: 1920,
      height: 1080,
      webPreferences: {
        offscreen: true,
      },
      showWindow: false,
    });

    const mainPosition = mainWindow.window.getPosition();
    const mainSize = mainWindow.window.getSize();
    const bounds = mainWindow.window.getBounds();
    const display = screen.getDisplayNearestPoint({x: bounds.x + bounds.width, y: bounds.y});

    pickerWindow = createWindow('picker', {
      width: 320,
      height: 640,
      minWidth: 250,
      maxWidth: 450,
      minHeight: 400,
      parent: mainWindow,
      closable: false,
      minimizable: false,
      fullscreenable: false,
      x: Math.max(0, mainPosition[0] - 320),
      y: mainPosition[1],
    });

    propertiesWindow = createWindow('properties', {
      width: 320,
      height: 640,
      minWidth: 250,
      maxWidth: 450,
      minHeight: 400,
      parent: mainWindow,
      closable: false,
      minimizable: false,
      fullscreenable: false,
      x: Math.min(display.size.width - 320, mainPosition[0] + mainSize[0]),
      y: mainPosition[1],
    });

    disableF4(pickerWindow.window);
    disableF4(propertiesWindow.window);

    const storeResize = debounce(250, () => {
      const size = mainWindow.window.getSize();
      const fullscreen = mainWindow.window.isFullScreen();
      setConfig({
        windowSize: {
          width: size[0],
          height: size[1],
          fullscreen,
        },
      });
    });

    mainWindow.window.on('resize', () => {
      storeResize();
    });

    mainWindow.emitter.on('ready', () => {
      const workFolder = getConfig('workFolder');

      if (!workFolder) {
        const setupWindow = createWindow('setup', {
          width: 640,
          height: 480,
          resizable: false,
          parent: mainWindow,
          modal: true,
          closable: false,
          minimizable: false,
          maximizable: false,
        });

        disableF4(setupWindow.window);
      }
    });
  });
});
