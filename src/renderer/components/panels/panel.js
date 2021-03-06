import deepmerge from 'deepmerge';
import { globalAppReset } from '../../../helpers/global-on';
import Block from "../base/Block";
import { getImage, processImageDefinitionLayer } from './processing/layers/image';
import { clearImageLabels, getLabel, imageLabel } from './processing/layers/label';

let applyEvents = globalAppReset(() => {
  clearImageLabels();
});

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
        imageStr = imageSize.file ?? imageSize.data;
      } else {
        imageStr = imageData.file ?? imageSize.data ?? null;
      }
    }
    if (imageStr) {
      block.element.style.backgroundImage = `url(${imageStr})`;
    }
  }
  return block;
};

const labelContent = async (block, layerInfo, {
  panelEntity,
  type,
  entity,
  imageId,
  showLabel = true,
  label = null,
}) => {
  if (showLabel) {
    let displayLabel = label ?? (panelEntity ? (panelEntity.allCapsName ? panelEntity.allCapsName : null) ?? (panelEntity.displayName ? panelEntity.displayName.toUpperCase() : null) : null) ?? await getLabel(type, entity, imageId);

    block.prop('textContent', displayLabel);
    if (layerInfo.display === 'image') {
      block.prop('textContent', '');
      const labelUrl = await imageLabel({
        label: displayLabel,
      });

      const labelImage = document.createElement('img');
      labelImage.className = 'label-image';
      labelImage.src = labelUrl;
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

export const getDefaultPanelLayout = () => ([
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
]);

const contentFuncs = {
  image: imageContent,
  label: labelContent,
};

const setPanelContent = async ({
  panel,
  panelEntity,
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
  const layers = design?.panels?.layers ?? getDefaultPanelLayout();

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
    panelEntity: panelEntity,
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
          contentFuncs[layer.type](block, layer, {
            ...contentProps,
            layerIndex: idx,
          })
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
  applyEvents();
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
