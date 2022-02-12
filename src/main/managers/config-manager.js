import { mkdir } from 'fs';

const { app, ipcMain, nativeTheme, dialog } = require('electron');
const path = require('path');
const { access, constants, readFile, writeFile, fstat, existsSync } = require('fs');
const deepmerge = require('deepmerge');

const defaultConfig = {
  darkMode: 'system',
  windowSize: {
    width: 800,
    height: 600,
  },
  workFolder: null,
};

const config = {
  ...defaultConfig,
};

const configFile = path.join(app.getPath('userData'), 'config.json');

const saveConfig = () => {
  writeFile(configFile, JSON.stringify(config, null, 2), (err) => {
    if (err) {
      // TODO: Show error
    }
  });
};

export const setDarkMode = (darkMode = null, save = true) => {
  config.darkMode = darkMode ?? config.darkMode;
  nativeTheme.themeSource = config.darkMode;

  if (save) {
    saveConfig();
  }
}

const fileLoad = new Promise((resolve) => {
  access(configFile, constants.F_OK, function(err) {
    if (!err) {
      readFile(configFile, {
        encoding: 'utf-8',
      }, (err, data) => {
        if (err) {
          console.log(err);
        } else {
          const fileConfig = JSON.parse(data);
          Object.assign(config, deepmerge(config, fileConfig));

          setDarkMode(null, false);
        }
        resolve();
      });
    } else {
      saveConfig();
      resolve();
    }
  });
});

export const executeOnConfigLoad = (fn) => {
  fileLoad.then(fn);
};

export const getConfig = (key = null) => {
  const configCopy = deepmerge({}, config);
  if (key) {
    return configCopy[key];
  }
  return configCopy;
};

export const setConfig = (data, save = true) => {
  Object.assign(config, deepmerge(config, data));
  if (save) {
    saveConfig();
  }
}

export const getWorkFolder = (override = null) => {
  switch (override ?? config.workFolder) {
    case 'appdata':
      return app.getPath('userData');
    case 'documents':
      return path.join(app.getPath('documents'), app.name);
    default:
      return config.workFolder;
  }
};

ipcMain.handle('dark-mode:check', () => nativeTheme.shouldUseDarkColors);
ipcMain.handle('dark-mode:toggle', () => {
  setDarkMode(nativeTheme.shouldUseDarkColors ? 'light' : 'dark');
  return nativeTheme.shouldUseDarkColors;
});
ipcMain.handle('dark-mode:system', () => {
  setDarkMode('system');
  return nativeTheme.shouldUseDarkColors;
});

ipcMain.handle('config:get-workfolder', (_event, override) => getWorkFolder(override));
ipcMain.handle('config:pick-folder', async (_event, choice) => {
  const defaultPath = choice || path.join(app.getPath('documents'), app.name);

  if (!existsSync(defaultPath)) {
    await new Promise((resolve) => {
      mkdir(defaultPath, {
        recursive: true,
      }, resolve);
    });
  }

  return dialog.showOpenDialog({
    defaultPath,
    properties: ['openDirectory', 'createDirectory'],
  });
});

ipcMain.handle('config:set-workfolder', async (_event, data) => {
  const {
    choice,
    customChoice,
  } = data;

  config.workFolder = choice === 'custom' ? customChoice : choice;
  let folder = config.workFolder;

  switch (choice) {
    case 'appdata':
      folder = path.join(app.getPath('userData'), 'work');
      break;
    case 'documents':
      folder = path.join(app.getPath('documents'), app.name);
    default:
      break;
  }

  if (choice === 'custom' && !existsSync(folder)) {
    await new Promise((resolve) => {
      mkdir(folder, {
        recursive: true,
      }, resolve);
    });
  }

  saveConfig();
});
