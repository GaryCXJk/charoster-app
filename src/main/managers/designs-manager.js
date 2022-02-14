import deepmerge from "deepmerge";
import { ipcMain } from "electron";
import traverse from "../../helpers/traverse";
import { fetchEntities, loadEntity, queueEntity } from "./file-manager";

const designs = {};
const designQueue = [];
const waiting = {};

let queueIsRunning = null;

const defaultDesign = {
  panels: {
    layout: [
      {
        type: 'image',
        size: ['panel', 'preview'],
      },
      {
        type: 'label',
        display: 'image',
      },
    ],
    border: {
      width: '0.1em',
    },
    gap: '0.25em',
    margin: '1.5em',
    image: {
      filters: [
        {
          type: 'drop-shadow',
          value: {
            x: '0.5em',
            y: '0.5em',
            radius: '0.2em',
            color: '#222',
          },
        }
      ],
    },
  },
  preview: {
    image: {
      filters: [
        {
          type: 'drop-shadow',
          value: {
            x: '0.5em',
            y: '0.5em',
            radius: '0.2em',
            color: '#222',
          },
        }
      ],
    },
  },
};
const sizes = {
  characters: {
    panel: 452 / 300,
    preview: 128 / 160,
  },
};

const sizeKeys = {
  characters: ['panel', 'preview'],
  stages: ['preview'],
};

export const getSizeKeys = (type) => {
  return sizeKeys[type] ?? [];
}

export const getSize = async (type, sizeId, designId = null) => {
  if (designId) {
    if (!designs[designId]) {
      // TODO: Load design file
    }
    const returnSize = designs[designId]?.size?.[type]?.[sizeId];
    if (returnSize) {
      return returnSize;
    }
  }
  if (sizes[type][sizeId]) {
    return sizes[type][sizeId];
  }
  return null;
}

export const getDesign = async (designId = null) => {

  let design = deepmerge({}, defaultDesign);
  if (designId) {
    const sizeSegments = designId.split('>');
    design = traverse(sizeSegments, designs);
    if (!design) {
      const designGroup = sizeSegments.slice(0, 2).join('>');
      queueEntity(designQueue, waiting, designGroup);
    }
    design = deepmerge(getDesign(), defaultDesign);
  }

  return design;
}

export const fetchDesigns = async (packFolder) => {
  return await fetchEntities('designs', packFolder);
}

const loadDesign = async (designId) => {
  return loadEntity('designs', waiting, designs, designId);
}

const runDesignQueue = async () => {
  if (queueIsRunning) {
    return;
  }
  queueIsRunning = createWaiter();
  while (designQueue.length) {
    const designId = designQueue.shift();
    await loadDesign(designId);
  }
  queueIsRunning.resolve();
  queueIsRunning = null;
}

export const queueDesign = (designId) => {
  queueEntity(designQueue, waiting, designId);

  runDesignQueue();
}

ipcMain.handle('designs:get', (_event, designId) => getDesign(designId));
