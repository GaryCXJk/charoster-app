import createWaiter from '@@helpers/create-waiter';
import deepmerge from 'deepmerge';
import Block from "../base/Block";

const imageQueue = [];
const waiters = {
  images: {},
};

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

    panelLabel.prop('textContent', (
      label ?? entity.allCapsDisplayName ?? (entity.displayName ? entity.displayName.toUpperCase() : null) ?? entity.allCapsName ?? (entity.name ?? entity.id).toUpperCase()
    ));
  }

  let panelImageId = imageId;

  if (!panelImageId && callbacks.setImage) {
    panelImageId = callbacks.setImage({
      entity,
    });
  }

  if (panelImageId) {
    const waiter = createWaiter();
    waiters.images[type] = waiters.images[type] ?? {};
    waiters.images[type][panelImageId] = waiter;

    queueImage(type, panelImageId);

    const imageData = await waiter;

    if (imageData) {
      panelImage.element.style.backgroundImage = `url(${imageData.panel})`;
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
