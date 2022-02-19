import * as path from 'path';
import deepmerge from "deepmerge";
import Sharp from 'sharp';
import { ipcMain } from "electron";
import createWaiter from "../../helpers/create-waiter";
import traverse from "../../helpers/traverse";
import { getConfig } from "./config-manager";
import { fetchEntities, loadEntity, queueEntity } from "./file-manager";
import { onAppReset } from '../helpers/manager-helper';
import { clearObject } from '../../helpers/object-helper';

const designs = {};
const designQueue = [];
const waiting = {};
const images = {};

let queueIsRunning = null;

const baseDesign = {
  page: {},
  panels: {},
  preview: {}
}

const defaultDesign = {
  panels: {
    layers: [
      {
        type: 'image',
        size: ['panel', 'preview'],
      },
      {
        type: 'label',
        display: 'image',
      },
      {
        type: "image",
        from: {
          definition: 'franchise',
          field: 'symbols',
        },
        color: '#fff',
        style: {
          element: {
            width: '2em',
            height: '2em',
            right: '-0.75em',
            bottom: '-0.75em',
          },
        },
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
            color: 'rgba(32, 32, 32, 0.7)',
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
            color: 'rgba(32, 32, 32, 0.7)',
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
    const defaultDesignCopy = deepmerge({}, baseDesign);
    const sizeSegments = designId.split('>');
    const designGroup = sizeSegments.splice(0, 2).join('>');
    sizeSegments.unshift(designGroup);
    design = traverse(sizeSegments, designs);
    if (!design) {
      queueDesign(designGroup);
      await waiting[designGroup];
      design = traverse(sizeSegments, designs);
    }
    if (design) {
      Object.keys(design).forEach((section) => {
        defaultDesignCopy[section] = defaultDesignCopy[section] ?? {};
        Object.assign(defaultDesignCopy[section], design[section]);
      });
    }
    design = defaultDesignCopy;
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

export const getDesignImage = async (imageId) => {
  let currentImageCache = images[imageId];
  if (currentImageCache) {
    if (currentImageCache instanceof Promise) {
      await currentImageCache;
      currentImageCache = images[imageId] ?? null;
    }
    return currentImageCache;
  }
  const waiter = createWaiter();
  images[imageId] = waiter;
  const [folder, designId, image] = imageId.split('>');
  const workFolder = getConfig('workFolder');
  const designPath = path.join(workFolder, 'packs', folder, 'designs', designId, image);

  const sharpImage = new Sharp(designPath);

  const buffer = await sharpImage
    .png()
    .toBuffer();

  images[imageId] = {
    raw: {
      buffer,
      data: `data:image/png;base64,${buffer.toString('base64')}`,
    },
  };
  waiter.resolve();
  return images[imageId];
}

ipcMain.handle('designs:get', (_event, designId = null) => getDesign(designId));

onAppReset(() => {
  clearObject(designs);
  clearObject(waiting);
  clearObject(images);
  designQueue.splice(0, designQueue.length);
});
