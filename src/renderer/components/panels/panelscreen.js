import Block from '@components/base/Block';
import { createPanel } from './panel';
import funcs from './funcs';
import { createDesignQueue, createStylesheet } from './panelstyle';
import { getEntity, getEntityObject } from './processing/entities';
import { getImage, processImageDefinitionLayer } from './processing/layers/image';
import { globalAppReset } from '../../../helpers/global-on';
import createPreviewCreditsContainerElement from './preview/credits';
import createPreviewInformationContainerElement from './preview/information';
import { debounce } from 'throttle-debounce';
import { getLabel, getLabelText, imageLabel } from './processing/layers/label';
import defaultLayout from './preview/defaultLayout';

let workspace = {};
const entities = getEntityObject();

let roster = [];
const elements = {};

let activePanel = null;
let addPanelCallbacks = null;

let setupPromise = null;

export const getRoster = () => roster;
export const setRoster = (newRoster) => {
  roster = newRoster;
};

export const awaitSetup = async () => {
  await setupPromise;
};

export const resetRoster = () => {
  setStyle();
  renderRoster();
}

export const setCurrentWorkspace = (newWorkspace, store = true, recreateRoster = false, updatePreview = true) => {
  workspace = newWorkspace;
  if (store) {
    storeWorkspace(null, store !== 'noUpdate');
  }
  if (recreateRoster) {
    const currentRoster = getCurrentRoster();
    roster = currentRoster.roster.map((entity) => addPanel(currentRoster.type, entity));
  }
  if (updatePreview && elements.preview) {
    elements.preview.resetPreview();
  }
  resetRoster();
}

export const getCurrentWorkspace = async () => {
  await setupPromise;
  return workspace;
};

export const getDesignId = () => getCurrentRoster().theme ?? workspace.theme ?? null;

export const getDesign = async () => {
  return await window.designs.get(getDesignId());
}

export const getCurrentRoster = () => workspace.rosters[workspace.displayRoster];

export const setStyle = async (placeholderRoster = null) => {
  const design = await getDesign();
  const designId = getDesignId();
  const designQueue = createDesignQueue(design, designId);
  const imageFiles = {};
  for (var idx = 0; idx < designQueue.length; idx += 1) {
    const file = designQueue[idx];
    const imageId = `${designId}>${file}`;
    imageFiles[file] = await getImage('designs', imageId, designId, true);
  }
  elements.style.innerHTML = createStylesheet({
    design,
    imageFiles,
    currentRoster: getCurrentRoster(),
    roster: placeholderRoster ?? roster,
  });
};

const getImageId = (type, entity) => {
  let imageId = null;
  if (funcs[type] && funcs[type].getImageId) {
    imageId = funcs[type].getImageId(entity);
  } else if (funcs.entities.getImageId) {
    imageId = funcs.entities.getImageId(entity);
  }

  return imageId;
};

const createPreviewImageElement = (layer, monitorElements) => {
  const image = new Block({
    className: `image`,
  });

  image.setPreview = async (type, entity) => {
    if (layer.file) {
      return;
    }
    const { entityId = null } = entity ?? {};
    if (entityId === null) {
      return;
    }
    const entityInfo = await getEntity(type, entityId);

    if (layer.from?.definition && layer.from?.field) {
      const values = entityInfo[layer.from.definition];
      if (values) {
        const imgStr = await processImageDefinitionLayer(layer, type, entity);
        if (imgStr) {
          image.css({
            backgroundImage: `url(${imgStr})`,
          });
        }
      }
    } else if (layer.size) {
      const imageId = entity.imageId ?? getImageId(type, entityInfo);

      const imageData = await getImage(type, imageId, getDesignId());

      image.css({
        backgroundImage: `url(${imageData.preview.file ?? imageData.preview.data})`,
      });
    }
  };

  image.clearPreview = () => {
    image.css({
      backgroundImage: null,
    });
  }

  monitorElements.push(image);

  return image;
}

const createPreviewLabelElement = (layer, monitorElements) => {
  const label = new Block({
    className: 'label',
  });

  if (layer.display === 'image') {
    const labelImage = document.createElement('img');
    labelImage.className = 'label-image';
    labelImage.src = '';
    label.append(labelImage);
    label.image = labelImage;
  }

  label.setPreview = async (type, entity) => {
    const { entityId = null } = entity ?? {};
    if (entityId === null) {
      return;
    }
    const entityInfo = await getEntity(type, entityId);
    let displayLabel = await getLabelText(
      layer.caps ?? true,
      (caps) => caps ? entity?.allCapsName : null,
      entity?.displayName,
      async () => await getLabel(type, entityInfo, entity.imageId, layer.caps),
    );

    if (layer.display === 'image') {
      const labelStyle = {};
      if (layer.fontColor) {
        labelStyle.fontColor = layer.fontColor;
      }
      const labelUrl = await imageLabel({
        label: displayLabel,
        ...labelStyle,
      });

      label.image.src = labelUrl;
    } else {
      label.prop('textContent', displayLabel);
    }
  };

  label.clearPreview = () => {
    if (layer.display === 'image') {
      label.image.src = '';
    } else {
      label.prop('textContent', '');
    }
  }

  monitorElements.push(label);

  return label;
};

const createPreviewImageContainerElement = async (data, monitorElements, depth = 0) => {
  const entityType = getCurrentRoster().type;
  const container = new Block({
    className: `image-container image-container-${entityType}`,
  });

  if (data.layers) {
    data.layers.forEach((layer, idx) => {
      if (layer.exclude && layer.exclude.includes(entityType)) {
        return;
      }
      if (layer.include && !layer.include.includes(entityType)) {
        return;
      }
      let element;
      switch (layer.type) {
        case 'container':
          element = createPreviewImageContainerElement(layer, monitorElements, depth + 1);
          break;
        case 'image':
          element = createPreviewImageElement(layer, monitorElements);
          break;
        case 'label':
          element = createPreviewLabelElement(layer, monitorElements);
          break;
        default:
          element = new Block({
            className: layer.type,
          });
          break;
      }
      if (element) {
        if (layer.className) {
          element.element.classList.add(...layer.className.split(' '));
        }
        element.element.classList.add('layer', `layer-${idx}`, `layer-${entityType}`, `layer-depth-${depth}`);
        container.append(element);
      }
    });
  }

  return container;
}

const createPreviewLayoutElements = async (preview, monitorElements, innerLayout = null, depth = 0) => {
  await setupPromise;
  const design = await getDesign();
  preview.empty();
  const layout = innerLayout ?? design.preview?.layout ?? defaultLayout;

  await layout.reduce(async (memo, element, idx) => {
    await memo;
    let container = null;
    switch (element.type) {
      case 'container':
        container = new Block({
          className: `preview-container`,
        });
        await createPreviewLayoutElements(container, monitorElements, element.layers ?? [], depth + 1);
        break;
      case 'image':
        container = await createPreviewImageContainerElement(element, monitorElements);
        break;
      case 'credits':
        container = createPreviewCreditsContainerElement(element, monitorElements);
        break;
      case 'information':
        container = createPreviewInformationContainerElement(element, monitorElements);
      default:
        break;
    }
    if (container) {
      container.element.classList.add('element', `element-${idx}`, `element-depth-${depth}`)
      preview.append(container);
    }
  }, Promise.resolve());
}

const createPreviewElements = (preview) => {
  let monitorElements = [];
  preview.setPreview = (type, entity) => {
    monitorElements.forEach((elem) => {
      elem.setPreview(type, entity);
    });
  };

  preview.clearPreview = () => {
    monitorElements.forEach((elem) => {
      elem.clearPreview();
    });
  }

  preview.resetPreview = () => {
    preview.empty();
    monitorElements = [];
    createPreviewLayoutElements(preview, monitorElements);
  }

  createPreviewLayoutElements(preview, monitorElements);
};

const clearPreview = () => {
  elements.preview.clearPreview();
}

export const setPreview = (type, entity) => {
  elements.preview.setPreview(type, entity);
}

export const sendSelection = debounce(250, (index) => {
  if (window.workspace?.setSelection) {
    window.workspace.setSelection(index);
  }
});

export const getSelection = () => {
  if (activePanel) {
    return {
      index: roster.indexOf(activePanel),
      panel: activePanel,
    };
  }
  return {
    index: -1,
    panel: null,
  };
};

export const clearSelection = () => {
  if (activePanel) {
    sendSelection(-1);
    activePanel.panel.element.classList.remove('active');
    activePanel = null;
    clearPreview();
  }
};

export const setSelection = (panel) => {
  const isActive = panel.panel.element.classList.contains('active');
  clearSelection();
  if (!isActive) {
    panel.panel.element.classList.add('active');
    activePanel = panel;
    setPreview(panel.entityType, panel.entity);
    sendSelection(roster.indexOf(panel));
  }
};

export const addPanel = (type, entity) => {
  const panelContainer = new Block({
    className: 'panel-container',
  });

  const setPanel = (entityObj) => {
    const panel = createPanel({
      type: type,
      designId: getDesignId(),
      design: getDesign(),
      panelEntity: entityObj,
      ...entityObj,
      callbacks: {
        panel: {
          click: () => {
            setSelection(panelContainer);
          },
        },
        image: {
          setEntity: async (entityId) => {
            entities[type] = entities[type] ?? {};
            let currentEntity = entities[type][entityId];

            if (!currentEntity) {
              currentEntity = await getEntity(type, entityId);
            }
            return currentEntity;
          },
          setImage: ({
            entity: imageEntity,
          }) => {
            return getImageId(type, imageEntity);
          }
        }
      },
    });
    panelContainer.append(panel);
    panelContainer.panel = panel;

    if (addPanelCallbacks) {
      addPanelCallbacks(panel);
    }

    panel.container = panelContainer;
  }
  setPanel(entity);
  panelContainer.entity = entity;
  panelContainer.entityType = type;
  panelContainer.update = (newEntity) => {
    panelContainer.panel.detach();
    setPanel(newEntity);
    panelContainer.entity = newEntity;
    if (activePanel === panelContainer) {
      panelContainer.panel.element.classList.add('active');
    }
  }

  return panelContainer;
};

export const renderRoster = (displayRoster = null) => {
  const useRoster = displayRoster ?? roster;
  elements.panels.empty();
  useRoster.forEach((panel) => {
    elements.panels.append(panel);
  });
  setStyle(displayRoster);
}

const prepareRoster = () => {
  roster = [];
  const currentRoster = getCurrentRoster();
  currentRoster.roster.forEach((entity) => {
    const panel = addPanel(currentRoster.type, entity);
    panel.entity = entity;
    roster.push(panel);
  });
  renderRoster();
};

const setupWorkspace = async () => {
  const workspaceStr = window.sessionStorage.getItem('currentWorkspace');
  if (workspaceStr) {
    workspace = JSON.parse(workspaceStr);
    return;
  }
  workspace = await window.workspace.retrieve();
}

export const storeWorkspace = async (newWorkspace = null, update = true) => {
  if (newWorkspace) {
    workspace = newWorkspace;
  }
  window.sessionStorage.setItem('currentWorkspace', JSON.stringify(workspace));
  if (update) {
    await window.workspace.update(workspace);
  }
}

const applyEvents = globalAppReset(() => {
  setupPromise = setupWorkspace();
  elements.preview.empty();
  createPreviewElements(elements.preview);
  const currentRoster = getCurrentRoster();
  roster = currentRoster.roster.map((entity) => addPanel(currentRoster.type, entity));
  resetRoster();
});

export const getScreenElement = (elementType) => {
  return elements[elementType] ?? null;
}

export default ({
  panels: panelsOptions = {},
  onAddPanel = null,
} = {}) => {
  applyEvents();
  addPanelCallbacks = onAddPanel;
  setupPromise = setupWorkspace();

  const content = new Block({
    className: 'content',
  });

  const panels = new Block({
    className: 'panels',
    ...panelsOptions,
  });
  content.append(panels);

  const preview = new Block({
    className: 'preview',
  });

  createPreviewElements(preview);

  const style = document.createElement('style');

  elements.content = content;
  elements.panels = panels;
  elements.preview = preview;
  elements.style = style;

  setupPromise.then(() => {
    setStyle();
    prepareRoster();
  });

  return elements;
}
