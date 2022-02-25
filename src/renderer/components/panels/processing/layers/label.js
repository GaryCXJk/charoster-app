import createWaiter from "../../../../../helpers/create-waiter";
import { clearObject } from "../../../../../helpers/object-helper";

const renderedLabels = {};

export const clearImageLabels = () => {
  Object.values(renderedLabels).forEach((url) => {
    URL.revokeObjectURL(url);
  });
  clearObject(renderedLabels);
};

export const getLabel = async (type, entity, imageId = null) => {
  let displayLabel;
  if (imageId) {
    const imageInfo = await window.packs.getImageInfo(type, imageId);
    displayLabel = displayLabel ?? imageInfo.allCapsDisplayName ?? (imageInfo.displayName ? imageInfo.displayName.toUpperCase() : null);
  }
  displayLabel = displayLabel ?? entity.allCapsDisplayName ?? (entity.displayName ? entity.displayName.toUpperCase() : null) ?? entity.allCapsName ?? (entity.name ?? entity.id).toUpperCase();
  return displayLabel;
};

export const imageLabel = async ({
  label = '',
  fontFamily = 'Montserrat',
  fontWeight = '900',
  fontColor = 'white',
}) => {
  let id = label;
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
