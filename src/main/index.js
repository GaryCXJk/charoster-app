import { app } from 'electron';
import { debounce } from 'throttle-debounce';
import { hasWindow, createWindow } from './managers/window-manager';
import { executeOnConfigLoad, getConfig, setConfig } from './managers/config-manager';
import { discoverPacks } from './managers/packs-manager';
import './managers/workspace-manager';
import './helpers/drag-helper';

let mainWindow;
let pickerWindow;

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

    const mainPosition = mainWindow.window.getPosition();

    pickerWindow = createWindow('picker', {
      width: 320,
      height: 600,
      minWidth: 250,
      maxWidth: 450,
      minHeight: 400,
      parent: mainWindow.window,
      closable: false,
      minimizable: false,
      fullscreenable: false,
      x: Math.max(0, mainPosition[0] - 300),
      y: mainPosition[1],
    });

    disableF4(pickerWindow.window);

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
          parent: mainWindow.window,
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
