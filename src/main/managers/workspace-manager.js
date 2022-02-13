import { ipcMain } from "electron";
import deepmerge from "deepmerge";
import { readFile, writeFile } from "fs/promises";

const defaultWorkspace = {
  title: 'Untitled',
  rosters: [
    {
      type: 'characters',
      mode: 'dynamic',
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
};

let workspace;

export const createWorkspace = () => {
  workspace = deepmerge({}, defaultWorkspace);
  return workspace;
}

export const loadWorkspace = async (file) => {
  try {
    const contents = await readFile(file, {
      encoding: 'utf-8',
    });

    // Ensures that the data only gets placed in the workspace if JSON can be parsed.
    const json = JSON.parse(contents);
    workspace = json;
  } catch (_e) {
    // TODO: Something.
  }

  return workspace;
}

export const saveWorkspace = async (file) => {
  try {
    await writeFile(file, JSON.stringify(workspace, null, 2), {
      encoding: 'utf-8',
    });
  } catch (_e) {
    // TODO: Something.
  }

  return workspace;
}

export const updateWorkspace = (workspaceData) => {
  workspace = workspaceData;

  return workspace;
}

createWorkspace();

ipcMain.handle('workspace:new', createWorkspace);
ipcMain.handle('workspace:load', (_event, file) => loadWorkspace(file));
ipcMain.handle('workspace:save', (_event, file) => saveWorkspace(file));
ipcMain.handle('workspace:retrieve', () => workspace);
ipcMain.handle('workspace:update', (_event, workspaceData) => updateWorkspace(workspaceData));
