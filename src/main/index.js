import { app, ipcMain, protocol, screen } from 'electron';
import { debounce } from 'throttle-debounce';
import { hasWindow, createWindow, destroyWindow } from './managers/window-manager';
import { executeOnConfigLoad, getConfig, getTempPath, removeTempFilesSync, setConfig } from './managers/config-manager';
import { discoverPacks } from './managers/packs-manager';
import './managers/workspace-manager';
import './helpers/drag-helper';
import onReady from './ready';

let mainWindow;
let pickerWindow;
let propertiesWindow;
let renderWindow;

const createMainWindow = (position = null) => {
  const { width = 800, height = 600, fullscreen = false, roundedCorners = true } = getConfig('windowSize');

  const window = createWindow('main', {
    width,
    height,
    ...(fullscreen ? { fullscreen } : {}),
    ...(position ? { x: position.x, y: position.y } : {}),
    minWidth: 800,
    minHeight: 600,
    fullscreenable: true,
    roundedCorners,
  });

  let doSync = false;

  const storeResize = debounce(250, () => {
    const size = window.window.getSize();
    const fullscreen = window.window.isFullScreen();
    setConfig({
      windowSize: {
        width: size[0],
        height: size[1],
        fullscreen,
      },
    });
    if (doSync && propertiesWindow) {
      propertiesWindow.window.webContents.send('window-resized', {
        width: size[0],
        height: size[1],
        fullscreen,
      });
      doSync = false;
    }
  });

  window.window.on('will-resize', () => {
    doSync = true;
  });

  window.window.on('resize', () => {
    storeResize(true);
  });

  window.emitter.on('ready', () => {
    const workFolder = getConfig('workFolder');

    if (!workFolder && !hasWindow('setup')) {
      const setupWindow = createWindow('setup', {
        width: 640,
        height: 480,
        resizable: false,
        parent: window,
        modal: true,
        closable: false,
        minimizable: false,
        maximizable: false,
      });

      if (setupWindow) {
        disableF4(setupWindow.window);
      }
    }
  });

  return window;
};

const rebindChildWindows = (childWindows = [], parent = null) => {
  const parentWindow = parent?.window ?? null;
  childWindows.forEach((childWindow) => {
    if (childWindow && !childWindow.isDestroyed()) {
      childWindow.setParentWindow(parentWindow);
    }
  });
};

const recreateMainWindow = async () => {
  const mainBounds = mainWindow?.window && !mainWindow.window.isDestroyed()
    ? mainWindow.window.getBounds()
    : null;
  const childWindows = mainWindow?.window && !mainWindow.window.isDestroyed()
    ? mainWindow.window.getChildWindows().filter((childWindow) => !childWindow.isDestroyed())
    : [];

  rebindChildWindows(childWindows, null);
  await destroyWindow('main');

  mainWindow = createMainWindow(mainBounds ? {
    x: mainBounds.x,
    y: mainBounds.y,
  } : null);
  rebindChildWindows(childWindows, mainWindow);

  return !!mainWindow;
};

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
};

ipcMain.handle('app:recreate-main-window', async () => {
  return await recreateMainWindow();
});

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
    createMainWindow();
  }
});

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  onReady();
  executeOnConfigLoad(() => {
    discoverPacks();
    mainWindow = createMainWindow();

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
  });
});
