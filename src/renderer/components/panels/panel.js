import deepmerge from 'deepmerge';
import Block from "../base/Block";
import { getImage, processImageDefinitionLayer } from './processing/layers/image';

const renderedLabels = {};

const imageContent = async (block, layerInfo, {
  type,
  entityId,
  imageId = null,
  entity,
  callbacks,
  designId = '',
  panelEntity = null,
}) => {
  let panelImageId = imageId;

  if (!panelImageId && callbacks.setImage) {
    panelImageId = callbacks.setImage({
      entity,
    });
  }

  if (panelImageId) {
    let usedSizes = ['raw'];
    let imageData = null;
    let imageStr = null;
    if (layerInfo.from?.definition && layerInfo.from?.field) {
      imageStr = await processImageDefinitionLayer(layerInfo, type, panelEntity ?? {
        entityId,
        imageId,
      });
    } else if (layerInfo.file) {
      imageData = await getImage('designs', `${designId}>${layerInfo.file}`, designId);
    } else {
      imageData = await getImage(type, panelImageId, designId);
      usedSizes = layerInfo.size ?? usedSizes;
    }

    if (imageData) {
      let imageSize = null;
      for (let idx = 0; idx < usedSizes.length; idx += 1) {
        const size = usedSizes[idx];
        if (imageData[size]) {
          imageSize = imageData[size];
          break;
        }
      }
      if (imageSize) {
        imageStr = imageSize.data;
      }
    }
    if (imageStr) {
      block.element.style.backgroundImage = `url(${imageStr})`;
    }
  }
  return block;
};

const labelContent = async (block, layerInfo, {
  type,
  entity,
  imageId,
  showLabel = true,
  label = null,
}) => {
  if (showLabel) {
    let displayLabel = label;
    if (!displayLabel) {
      if (imageId) {
        const imageInfo = await window.packs.getImageInfo(type, imageId);
        displayLabel = displayLabel ?? imageInfo.allCapsDisplayName ?? (imageInfo.displayName ? imageInfo.displayName.toUpperCase() : null);
      }
      displayLabel = displayLabel ?? entity.allCapsDisplayName ?? (entity.displayName ? entity.displayName.toUpperCase() : null) ?? entity.allCapsName ?? (entity.name ?? entity.id).toUpperCase();
    }

    block.prop('textContent', displayLabel);
    if (layerInfo.display === 'image') {
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

      block.prop('textContent', '');
      const labelImage = document.createElement('img');
      labelImage.className = 'label-image';
      labelImage.src = renderedLabels[displayLabel];
      block.append(labelImage);
    }

    return block;
  }
  return null;
};

const preContentFuncs = {
  image: (layerInfo, { type }) => ({
    shown: true,
    className: !layerInfo.file ? `image image-${type}` : null,
  }),
  label: (_layerInfo, { showLabel = true }) => ({
    shown: showLabel,
  }),
};

const contentFuncs = {
  image: imageContent,
  label: labelContent,
};

const setPanelContent = async ({
  panel,
  type,
  entityId,
  callbacks = {},
  design: designPromise = null,
  ...props
}) => {
  let design = null;
  if (designPromise) {
    design = await designPromise;
  }
  const layers = design?.panels?.layers ?? [
    {
      type: 'image',
      size: ['panel', 'preview'],
    },
    {
      type: 'label',
      display: 'image',
    },
  ];

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

  const blockPromises = [];
  const contentProps = {
    type,
    entity,
    design,
    callbacks,
    ...props
  };

  for (let idx = 0; idx < layers.length; idx += 1) {
    const layer = layers[idx];
    const contentInfo = {
      shown: true,
      className: layer.type,
    };
    if (preContentFuncs[layer.type]) {
      Object.assign(contentInfo, preContentFuncs[layer.type](layer, contentProps));
    }

    if (layer.className) {
      contentInfo.className = `${contentInfo.className ?? layer.type} ${layer.className}`;
    }

    if (contentInfo.shown) {
      const block = new Block({
        className: `layer layer-${idx} ${contentInfo.className}`,
      });
      panel.append(block);
      if (contentFuncs[layer.type]) {
        blockPromises.push(
          contentFuncs[layer.type](block, layer, contentProps)
        );
      }
    }
  }

  await Promise.all(blockPromises);
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

  setPanelContent({
    ...options,
    panel,
    type,
    entityId,
    imageId,
    callbacks: callbacks.image ?? {},
  });

  return panel;
}
