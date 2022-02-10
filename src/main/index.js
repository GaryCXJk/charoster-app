import { app } from 'electron';
import { debounce } from 'throttle-debounce';
import { hasWindow, createWindow } from './window-manager';
import { executeOnConfigLoad, getConfig, setConfig } from './config-manager';

let mainWindow;

// quit application when all windows are closed
app.on('window-all-closed', () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (hasWindow('main')) {
    createWindow('main');
  }
});

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  executeOnConfigLoad(() => {
    const windowSize = getConfig('windowSize');
    mainWindow = createWindow('main', {
      ...windowSize,
      minWidth: 800,
      minHeight: 600,
    });

    const storeResize = debounce(250, () => {
      const size = mainWindow.window.getSize();
      setConfig({
        windowSize: {
          width: size[0],
          height: size[1],
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
        });
      }
    });
  });
});
