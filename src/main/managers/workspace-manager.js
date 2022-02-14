import { dialog, ipcMain } from "electron";
import deepmerge from "deepmerge";
import * as path from "path";
import { readFile, writeFile } from "fs/promises";
import { getWorkFolder } from "./config-manager";
import { getWindow } from "./window-manager";

const defaultWorkspace = {
  title: 'Untitled',
  rosters: [
    {
      type: 'characters',
      mode: 'dynamic',
      theme: 'default',
      width: 8,
      height: 5,
      alignment: {
        horizontal: 'center',
        vertical: 'center',
      },
      roster: [],
      meta: {
        rowColRatio: [3, 8],
      },
    }
  ],
  displayRoster: 0,
  theme: 'default',
};

let workspace;
let workspaceFile = null;

export const createWorkspace = () => {
  workspace = deepmerge({}, defaultWorkspace);
  return workspace;
}

export const loadWorkspace = async (screen) => {
  const status = await dialog.showOpenDialog(getWindow(screen).window, {
    defaultPath: getWorkFolder(),
    properties: ['openFile'],
  });
  if (status.cancelled) {
    return workspace;
  }
  try {
    const contents = await readFile(status.filePaths[0], {
      encoding: 'utf-8',
    });

    // Ensures that the data only gets placed in the workspace if JSON can be parsed.
    const json = JSON.parse(contents);
    workspace = json;
    workspaceFile = status.filePaths[0];
  } catch (_e) {
    // TODO: Something.
  }

  return workspace;
}

export const saveWorkspace = async (screen, saveAs = false) => {
  let saveFile = workspaceFile;
  if (!workspaceFile || saveAs) {
    const status = await dialog.showSaveDialog(getWindow(screen).window, {
      defaultPath: path.join(getWorkFolder(), `${workspace.title}.json`),
    });
    if (status.canceled) {
      return workspace;
    }
    saveFile = status.filePath;
  }
  try {
    await writeFile(saveFile, JSON.stringify(workspace, null, 2), {
      encoding: 'utf-8',
    });
    workspaceFile = saveFile;
  } catch (_e) {
    // TODO: Something.
  }

  return workspace;
}

export const updateWorkspace = (workspaceData) => {
  workspace = workspaceData;

  return workspace;
}

export const getWorkspace = () => workspace;

createWorkspace();

ipcMain.handle('workspace:new', createWorkspace);
ipcMain.handle('workspace:load', (_event, screen) => loadWorkspace(screen));
ipcMain.handle('workspace:save', (_event, screen, saveAs = false) => saveWorkspace(screen, saveAs));
ipcMain.handle('workspace:retrieve', getWorkspace);
ipcMain.handle('workspace:update', (_event, workspaceData) => updateWorkspace(workspaceData));
