import { dialog, ipcMain } from "electron";
import deepmerge from "deepmerge";
import * as path from "path";
import { readFile, writeFile } from "fs/promises";
import Sharp from 'sharp';
import { getWorkFolder } from "./config-manager";
import { getWindow, notifyWindow, notifyWindowWithReply } from "./window-manager";

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
let workspaceFile = null;

export const createWorkspace = () => {
  workspace = deepmerge({}, defaultWorkspace);
  workspaceFile = null;
  return workspace;
}

export const loadWorkspace = async (screen) => {
  const status = await dialog.showOpenDialog(getWindow(screen).window, {
    defaultPath: getWorkFolder(),
    filters: [
      {
        name: 'JSON',
        extensions: ['json'],
      }
    ],
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
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
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

  notifyWindow('sync-workspace', workspace);

  return workspace;
}

export const getWorkspace = () => workspace;

createWorkspace();

const exportImage = async (screen, options = {}) => {
  const window = getWindow('render');
  const [width, height] = window.window.getSize();
  if (options.size) {
    window.window.setSize(options.size.width ?? width, options.size.height ?? height);
  }

  if (options.includeCredits) {
    const reply = await notifyWindowWithReply('request-credits-size', {
      columns: options.creditsColumns ?? 3,
    }, 'render');
    const [ addedHeight ] = reply;

    if (addedHeight) {
      const [currentWidth, currentHeight] = window.window.getSize();
      window.window.setSize(currentWidth, currentHeight + addedHeight);
    }
  }

  const [imageWidth, imageHeight] = window.window.getSize();
  const image = Sharp({
    create: {
      width: imageWidth,
      height: imageHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }
  });

  const imageCols = Math.ceil(imageWidth / 1024);
  const imageRows = Math.ceil(imageHeight / 1024);
  const composites = [];

  for (let x = 0; x < imageCols; x += 1) {
    for (let y = 0; y < imageRows; y += 1) {
      const rect = {
        x: x * 1024,
        y: y * 1024,
        width: Math.min((x + 1) * 1024, imageWidth) - (x * 1024),
        height: Math.min((y + 1) * 1024, imageHeight) - (y * 1024),
      };
      const subImage = await window.window.webContents.capturePage(rect);
      composites.push({ input: subImage.toPNG(), left: rect.x, top: rect.y })
    }
  }
  image.composite(composites);
  const status = await dialog.showSaveDialog(getWindow(screen).window, {
    defaultPath: getWorkFolder(),
    filters: [
      {
        name: 'PNG',
        extensions: ['png'],
      },
      {
        name: 'JPEG',
        extensions: ['jpg', 'jpeg'],
      },
      {
        name: 'WEBP',
        extensions: ['webp'],
      }
    ],
    properties: [],
  });
  window.window.setSize(width, height);

  if (options.includeCredits) {
    notifyWindow('cleanup-credits', {}, 'render');
  }
  if (status.canceled) {
    return null;
  }
  let type = 'png';
  let filePath = status.filePath.toString();
  const match = filePath.match(/\.(png|jpg|jpeg|webp)$/);
  if (match) {
    type = match[1];
  } else {
    filePath = `${filePath}.png`;
  }
  let buffer;
  switch (type) {
    case 'webp':
      // buffer = await (new Sharp(image.toPNG())).webp({ lossless: true }).toBuffer();
      buffer = await image.webp({ lossless: true }).toBuffer();
      break;
    case 'jpg':
    case 'jpeg':
      // buffer = image.toJPEG();
      buffer = await image.jpeg().toBuffer();
      break;
    case 'png':
    default:
      // buffer = image.toPNG();
      buffer = await image.png().toBuffer();
      break;
  }
  await writeFile(filePath, buffer);
}

ipcMain.handle('workspace:new', createWorkspace);
ipcMain.handle('workspace:load', (_event, screen) => loadWorkspace(screen));
ipcMain.handle('workspace:save', (_event, screen, saveAs = false) => saveWorkspace(screen, saveAs));
ipcMain.handle('workspace:retrieve', getWorkspace);
ipcMain.handle('workspace:update', (_event, workspaceData) => updateWorkspace(workspaceData));
ipcMain.handle('workspace:export-image', (_event, screen, options = {}) => exportImage(screen, options));
ipcMain.handle('workspace:set-selection', (_event, index) => notifyWindow('set-selection', index));
