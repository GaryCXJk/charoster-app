import createWaiter from "@@helpers/create-waiter";
import { globalAppReset } from "../../../../../helpers/global-on";
import { clearObject } from "../../../../../helpers/object-helper";
import { getEntity } from "../entities";
import { convertImageDataArray } from "../image-helpers";
import setSVG from './image/svg';

const imageCache = {};
const imageWaiters = {};
const imageQueue = [];

let queueRunning = false;

const applyEvents = globalAppReset(() => {
  clearObject(imageCache);
  clearObject(imageWaiters);
  imageQueue.splice(0, imageQueue.length);
});

const imageFilters = {
  characters: ['panel', 'preview'],
  stages: ['preview'],
};

const runImageQueue = async () => {
  if (queueRunning) {
    return;
  }
  queueRunning = true;

  while (imageQueue.length) {
    const [designId, type, imageId] = imageQueue.shift();

    const imageData = await window.packs.getImages(type, imageId, imageFilters[type]);
    imageWaiters[designId][type][imageId].resolve(imageData);
    imageQueue[`${designId},${type}:${imageId}`] = imageData;
  }

  queueRunning = false;
};

const queueImage = (type, imageId, designId = '') => {
  imageQueue.push([designId, type, imageId]);
  runImageQueue();
};

export const getImage = async (type, imageId, designId = '') => {
  applyEvents();
  const cacheStr = `${designId},${type}:${imageId}`;
  if (imageCache[cacheStr]) {
    return imageCache[cacheStr];
  }
  imageWaiters[designId] = imageWaiters[designId] ?? {};
  imageWaiters[designId][type] = imageWaiters[designId][type] ?? {};
  imageWaiters[designId][type][imageId] = imageWaiters[designId][type][imageId] ?? createWaiter();
  const waiter = imageWaiters[designId][type][imageId];

  queueImage(type, imageId, designId);

  return await waiter;
}

export const processImageDefinitionLayer = async (layer, type, entity) => {
  applyEvents();
  const { entityId } = entity;
  const entityInfo = await getEntity(type, entityId);

  const values = entityInfo[layer.from.definition];
  if (values) {
    const imageData = await window.definitions.getDefinitionValue(layer.from.definition, values, layer.from.field, entityInfo.pack ?? null);
    const imageMap = convertImageDataArray(imageData);
    let imageId = null;
    if (entity[layer.from.definition]?.[layer.from?.field]) {
      imageId = entity[layer.from.definition][layer.from.field];
    } else {
      let imageEntry = imageData;
      while (Array.isArray(imageEntry)) {
        imageEntry = imageEntry[0];
      }
      if (imageEntry) {
        imageId = imageEntry.fullId;
      }
    }
    const pickedImage = imageMap[imageId];
    if (!pickedImage) {
      return null;
    }
    let imgStr = null;
    switch (pickedImage.type) {
      case 'svg':
        imgStr = setSVG(pickedImage.content, layer);
        break;
      case 'default':
        break;
    }
    return imgStr;
  }
}
