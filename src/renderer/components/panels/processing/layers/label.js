import createWaiter from "../../../../../helpers/create-waiter";
import { clearObject } from "../../../../../helpers/object-helper";

const renderedLabels = {};

export const clearImageLabels = () => {
  Object.values(renderedLabels).forEach((url) => {
    URL.revokeObjectURL(url);
  });
  clearObject(renderedLabels);
};

export const getLabelText = async (allCaps = false, ...labels) => {
  let label = null;
  let idx = 0;
  while (label === null && idx < labels.length) {
    label = labels[idx] ?? null;
    if (typeof label === 'function') {
      label = await label(allCaps) ?? null;
    } else if (label !== null && allCaps) {
      label = label.toUpperCase();
    }
    idx+= 1;
  }
  return label;
};

export const getLabel = async (type, entity, imageId = null, allCaps = true) => {
  let displayLabel;
  if (imageId) {
    const imageInfo = await window.packs.getImageInfo(type, imageId);
    displayLabel = displayLabel ?? await getLabelText(
      allCaps,
      (caps) => caps ? imageInfo.allCapsDisplayName : null,
      imageInfo.displayName,
    );
    if (!displayLabel) {
      const imageIdGroup = imageId.split('>').slice(0, -1).join('>');
      if (entity.imageMap[imageIdGroup]) {
        const imageGroup = entity.imageMap[imageIdGroup];
        displayLabel = displayLabel ?? await getLabelText(
          allCaps,
          (caps) => caps ? imageGroup.allCapsDisplayName : null,
          imageGroup.displayName,
        );
      }
    }
  }
  displayLabel = displayLabel ?? await getLabelText(
    allCaps,
    (caps) => caps ? entity.allCapsDisplayName : null,
    entity.displayName,
    (caps) => caps ? entity.allCapsName : null,
    entity.name,
    entity.id,
  );
  return displayLabel;
};

export const imageLabel = async ({
  label = '',
  fontFamily = 'Montserrat',
  fontWeight = '900',
  fontColor = 'white',
}) => {
  let id = `${label}>>${fontWeight} ${fontFamily}, ${fontColor}`;
  if (!renderedLabels[id]) {
    const waiter = createWaiter();
    renderedLabels[id] = waiter;
    await document.fonts.ready;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${fontWeight} 144px "${fontFamily}"`;
    context.fillStyle = fontColor;
    const metric = context.measureText(label);
    const labelY = Math.ceil(metric.actualBoundingBoxAscent);
    const labelWidth = Math.ceil(metric.width);
    const labelHeight = Math.ceil(metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent);

    canvas.width = labelWidth;
    canvas.height = labelHeight;
    context.font = `${fontWeight} 144px "${fontFamily}"`;
    context.fillStyle = fontColor;
    context.fillText(label, 0, labelY);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve));
    renderedLabels[id] = URL.createObjectURL(blob);
    waiter.resolve();
  } else if (renderedLabels[id] instanceof Promise) {
    await renderedLabels[id];
  }
  return renderedLabels[id];
};
