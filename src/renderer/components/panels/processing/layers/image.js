import createWaiter from "@@helpers/create-waiter";
import { globalAppReset } from "../../../../../helpers/global-on";
import { clearObject } from "../../../../../helpers/object-helper";
import { getEntity } from "../entities";
import { convertImageDataArray } from "../image-helpers";
import setSVG, { releaseURLs } from './image/svg';

const imageCache = {};
const imageWaiters = {};
const imageQueue = [];
const urlBuffer = {};

let queueRunning = false;

const applyEvents = globalAppReset(() => {
  clearObject(imageCache);
  clearObject(imageWaiters);
  clearObject(urlBuffer);
  imageQueue.splice(0, imageQueue.length);
  releaseURLs();
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

const queueImage = (type, imageId, designId = '', prioritize = false) => {
  imageQueue[prioritize ? 'unshift' : 'push']([designId, type, imageId]);
  runImageQueue();
};

export const getImage = async (type, imageId, designId = '', prioritize = false) => {
  applyEvents();
  const cacheStr = `${designId},${type}:${imageId}`;
  if (imageCache[cacheStr]) {
    return imageCache[cacheStr];
  }
  imageWaiters[designId] = imageWaiters[designId] ?? {};
  imageWaiters[designId][type] = imageWaiters[designId][type] ?? {};
  imageWaiters[designId][type][imageId] = imageWaiters[designId][type][imageId] ?? createWaiter();
  const waiter = imageWaiters[designId][type][imageId];

  queueImage(type, imageId, designId, prioritize);

  return await waiter;
}

export const processImageDefinitionLayer = async (layer, type, entity, image = null) => {
  applyEvents();
  const { entityId } = entity;
  if (!entityId) {
    return null;
  }
  const entityInfo = await getEntity(type, entityId);
  const definitionInfo = await window.definitions.getDefinition(layer.from.definition);

  const values = entityInfo[layer.from.definition];
  if (values) {
    let pickedImage = image;
    const fieldInfo = definitionInfo?.fields?.[layer.from.field] ?? null;
    if (fieldInfo && typeof fieldInfo === 'object' && fieldInfo.entityProp) {
      const fieldName = `${layer.from.definition}:${fieldInfo.entityProp}`;
      pickedImage = entity[fieldName] ?? entityInfo[fieldName] ?? null;
    }
    if (pickedImage) {
      pickedImage = await window.definitions.getDefinitionEntity(layer.from.definition, layer.from.field, pickedImage);
    }
    if (!pickedImage) {
      const imageData = await window.definitions.getDefinitionValue(layer.from.definition, values, layer.from.field, entityInfo.pack ?? null);
      const imageMap = convertImageDataArray(imageData);
      let imageId = null;
      if (entity[layer.from.definition]?.[layer.from?.field]) {
        imageId = entity[layer.from.definition][layer.from.field];
      } else {
        let imageEntry = imageData;
        while (Array.isArray(imageEntry)) {
          imageEntry = imageEntry[0];
          if ((typeof imageEntry === 'object' && imageEntry.key && imageEntry.value)) {
            imageEntry = imageEntry.value;
          }
        }
        if (imageEntry) {
          imageId = imageEntry.fullId;
        }
      }
      pickedImage = imageMap[imageId];
    }
    if (!pickedImage) {
      return null;
    }
    let imgStr = null;
    switch (pickedImage.type) {
      case 'svg':
        const urlBufferKey = `${pickedImage.fullId}${layer.color ? `:${layer.color}` : ''}`;
        if (urlBuffer[urlBufferKey]) {
          imgStr = urlBuffer[urlBufferKey];
        } else {
          imgStr = setSVG(pickedImage.content, layer);
          urlBuffer[urlBufferKey] = imgStr;
        }
        break;
      case 'default':
        break;
    }
    return imgStr;
  }
}
