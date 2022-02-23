import { mkdir, mkdtempSync, rmSync } from 'fs';
import { rm } from 'fs/promises';
import createWaiter from '../../helpers/create-waiter';
import { onAppReset } from '../helpers/manager-helper';

const { app, ipcMain, nativeTheme, dialog } = require('electron');
const path = require('path');
const { access, constants, readFile, writeFile, existsSync } = require('fs');
const deepmerge = require('deepmerge');

const workFolderWaiter = createWaiter();

const defaultConfig = {
  darkMode: 'system',
  windowSize: {
    width: 800,
    height: 600,
  },
  workFolder: null,
  maxRenderWidth: {
    characters: 128,
    stages: 256
  }
};

const config = deepmerge({}, defaultConfig);

const configFile = path.join(app.getPath('userData'), 'config.json');

let tempFolder = app.getPath('temp');
let tempClear = false;
let tempFiles = [];

const createTempFolder = () => {
  tempFolder = app.getPath('temp');
  tempClear = false;
  tempFiles = [];
  try {
    const tFolder = mkdtempSync(path.join(tempFolder, app.name));
    tempFolder = tFolder;
    tempClear = true;
  } catch (_e) {

  }
}
createTempFolder();

export const getTempPath = () => tempFolder;
export const addTempFile = (file) => {
  tempFiles.push(file);
}
export const setTempFile = (file) => {
  if (!tempClear) {
    tempFiles.push(file);
  }
}
export const removeTempFilesSync = () => {
  if (tempClear) {
    try {
      rmSync(tempFolder, {
        recursive: true,
      });
    } catch (_e) {

    }
  } else {
    try {
      for (let idx = 0; idx < tempFiles.length; idx++) {
        const filePath = path.join(tempFolder, tempFiles[idx]);
        rmSync(filePath);
      }
    } catch (_e) {

    }
  }
}

export const removeTempFiles = async (remakeTmpFolder = false) => {
  if (tempClear) {
    try {
      await rm(tempFolder, {
        recursive: true,
      });
      if (remakeTmpFolder) {
        createTempFolder();
      }
    } catch (_e) {

    }
  } else {
    try {
      while (tempFiles.length) {
        const filePath = path.join(tempFolder, tempFiles.shift());
        await rm(filePath);
      }
    } catch (_e) {

    }
  }
}

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
          let fileConfig;
          try {
            fileConfig = JSON.parse(data);
          } catch (_e) {
            fileConfig = deepmerge({}, defaultConfig);
          }
          Object.assign(config, deepmerge(config, fileConfig));

          setDarkMode(null, false);
        }
        if (config.workFolder) {
          workFolderWaiter.resolve();
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

export const waitForWorkFolder = async () => {
  await workFolderWaiter;
}

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
ipcMain.handle('config:pick-folder', async (_event, id, choice) => {
  const defaultPath = choice || path.join(app.getPath('documents'), app.name);

  if (!existsSync(defaultPath)) {
    await new Promise((resolve) => {
      mkdir(defaultPath, {
        recursive: true,
      }, resolve);
    });
  }

  return dialog.showOpenDialog(getWindow(id), {
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

  workFolderWaiter.resolve();
  saveConfig();
});

onAppReset(() => {
  removeTempFiles(true);
});
