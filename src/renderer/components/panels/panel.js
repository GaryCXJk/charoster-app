import createWaiter from '@@helpers/create-waiter';
import deepmerge from 'deepmerge';
import Block from "../base/Block";

const imageQueue = [];
const waiters = {
  images: {},
};
const renderedLabels = {};

let queueRunning = false;

const runImageQueue = async () => {
  if (queueRunning) {
    return;
  }
  queueRunning = true;

  while (imageQueue.length) {
    const [type, imageId] = imageQueue.shift();

    const imageData = await window.packs.getImages(type, imageId);
    waiters.images[type][imageId].resolve(imageData);
  }

  queueRunning = false;
};

const queueImage = (type, imageId) => {
  imageQueue.push([type, imageId]);
  runImageQueue();
};

export const getImage = async (type, imageId) => {
  waiters.images[type] = waiters.images[type] ?? {};
  waiters.images[type][imageId] = waiters.images[type][imageId] ?? createWaiter();
  const waiter = waiters.images[type][imageId];

  queueImage(type, imageId);

  return await waiter;
}

const setPanelImage = async ({
  panel,
  type,
  entityId,
  imageId = null,
  callbacks = {},
  showLabel = true,
  label = null,
}) => {
  const panelImage = new Block({
    className: 'image',
  });
  panel.append(panelImage);

  let entity = null;

  if (callbacks.setEntity) {
    entity = await callbacks.setEntity(entityId);
  }

  if (!entity) {
    return null;
  }

  entity = deepmerge({}, entity);

  if (callbacks.preprocessEntity) {
    callbacks.preprocessEntity(entity);
  }

  if (showLabel) {
    const panelLabel = new Block({
      className: 'label',
    });
    panel.append(panelLabel);

    const displayLabel = label ?? entity.allCapsDisplayName ?? (entity.displayName ? entity.displayName.toUpperCase() : null) ?? entity.allCapsName ?? (entity.name ?? entity.id).toUpperCase();

    panelLabel.prop('textContent', displayLabel);

    if (!renderedLabels[displayLabel]) {
      await document.fonts.ready;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = 'bold 144px "Montserrat"';
      context.fillStyle = 'white';
      const metric = context.measureText(displayLabel);
      const labelY = Math.ceil(metric.actualBoundingBoxAscent);
      const labelWidth = Math.ceil(metric.width);
      const labelHeight = Math.ceil(metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent);

      canvas.width = labelWidth;
      canvas.height = labelHeight;
      context.font = 'bold 144px Montserrat';
      context.fillStyle = 'white';
      context.fillText(displayLabel, 0, labelY);
      renderedLabels[displayLabel] = canvas.toDataURL();
    }

    panelLabel.prop('textContent', '');
    const labelImage = document.createElement('img');
    labelImage.className = 'label-image';
    labelImage.src = renderedLabels[displayLabel];
    panelLabel.append(labelImage);
  }

  let panelImageId = imageId;

  if (!panelImageId && callbacks.setImage) {
    panelImageId = callbacks.setImage({
      entity,
    });
  }

  if (panelImageId) {
    const imageData = await getImage(type, panelImageId);

    if (imageData) {
      panelImage.element.style.backgroundImage = `url(${imageData.panel.data})`;
    }
  }
};

export const createPanel = ({
  type,
  entityId,
  imageId = null,
  draggable = false,
  callbacks = {},
  ...options
}) => {
  const panel = new Block({
    className: 'panel',
    draggable: draggable,
    on: callbacks.panel ?? {},
  });

  setPanelImage({
    ...options,
    panel,
    type,
    entityId,
    imageId,
    callbacks: callbacks.image ?? {},
  });

  return panel;
}
