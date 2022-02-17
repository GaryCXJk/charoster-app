import Block from '@components/base/Block';
import { createPanel } from './panel';
import funcs from './funcs';
import { createDesignQueue, createStylesheet } from './panelstyle';
import { getEntity, getEntityObject } from './processing/entities';
import { getImage, processImageDefinitionLayer } from './processing/layers/image';
import { globalAppReset } from '../../../helpers/global-on';

let workspace = {};
const entities = getEntityObject();

let roster = [];
const elements = {};
let placeholderRoster = null;

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

export const setCurrentWorkspace = (newWorkspace, store = true, recreateRoster = false) => {
  workspace = newWorkspace;
  if (store) {
    storeWorkspace();
  }
  if (recreateRoster) {
    const currentRoster = getCurrentRoster();
    roster = currentRoster.roster.map((entity) => addPanel(currentRoster.type, entity));
  }
  elements.preview.resetPreview();
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

const setStyle = async () => {
  const design = await getDesign();
  const designId = getDesignId();
  const designQueue = createDesignQueue(design, designId);
  const imageFiles = {};
  for (var idx = 0; idx < designQueue.length; idx += 1) {
    const file = designQueue[idx];
    const imageId = `${designId}>${file}`;
    imageFiles[file] = await getImage('designs', imageId, designId);
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
    const { entityId } = entity;
    const entityInfo = await getEntity(type, entityId);

    if (layer.from?.definition && layer.from?.field) {
      const values = entityInfo[layer.from.definition];
      if (values) {
        /*
        const imageData = await window.definitions.getDefinitionValue(layer.from.definition, values, layer.from.field);
        const imageMap = convertImageDataArray(imageData);
        let imageId = null;
        if (entity[layer.from.definition]?.[layer.from?.field]) {
          imageId = entity[layer.from.definition][layer.from.field];
        } else {
          let imageEntry = imageData;
          while (Array.isArray(imageEntry)) {
            imageEntry = imageEntry[0];
          }
          imageId = imageEntry.fullId;
        }
        const pickedImage = imageMap[imageId];
        let imgStr = null;
        switch (pickedImage.type) {
          case 'svg':
            imgStr = setSVG(pickedImage.content, layer);
            break;
          case 'default':
            break;
        }
        */
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
        backgroundImage: `url(${imageData.preview.data})`,
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

const createPreviewImageContainerElement = (data, monitorElements) => {
  const container = new Block({
    className: 'image-container',
  });

  if (data.layers) {
    data.layers.forEach((layer, idx) => {
      let element;
      switch (layer.type) {
        case 'image':
          element = createPreviewImageElement(layer, monitorElements);
          break;
        default:
          break;
      }
      if (element) {
        if (layer.className) {
          element.element.classList.add(...layer.className.split(' '));
        }
        element.element.classList.add('layer', `layer-${idx}`);
        container.append(element);
      }
    });
  }

  return container;
}

const createPreviewLayoutElements = async (preview, monitorElements) => {
  await setupPromise;
  const design = await getDesign();
  const layout = design.preview?.layout ?? [
    {
      type: "image",
      layers: [
        {
          type: "image",
          size: [
            "preview"
          ],
        },
      ],
    },
  ];

  layout.forEach((element, idx) => {
    let container = null;
    switch (element.type) {
      case 'image':
        container = createPreviewImageContainerElement(element, monitorElements);
        break;
      default:
        break;
    }
    if (container) {
      container.element.classList.add('element', `element-${idx}`)
      preview.append(container);
    }
  });
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

const setPreview = (type, entity) => {
  elements.preview.setPreview(type, entity);
}

const clearSelection = () => {
  if (activePanel) {
    activePanel.panel.element.classList.remove('active');
    activePanel = null;
    clearPreview();
  }
};

const setSelection = (panel) => {
  const isActive = panel.panel.element.classList.contains('active');
  clearSelection();
  if (!isActive) {
    panel.panel.element.classList.add('active');
    activePanel = panel;
    setPreview(panel.entityType, panel.entity);
  }
};

export const addPanel = (type, entity) => {
  const panelContainer = new Block({
    className: 'panel-container',
  });

  const panel = createPanel({
    type: type,
    designId: getDesignId(),
    design: getDesign(),
    panelEntity: entity,
    ...entity,
    callbacks: {
      panel: {
        click: () => {
          setSelection(panelContainer);
        },
      },
      image: {
        setEntity: async (entityId) => {
          entities[type] = entities[type] ?? {};
          let entity = entities[type][entityId];

          if (!entity) {
            entity = await getEntity(type, entityId);
          }
          return entity;
        },
        setImage: ({
          entity,
        }) => {
          return getImageId(type, entity);
        }
      }
    },
  });
  panelContainer.append(panel);
  panelContainer.panel = panel;
  panelContainer.entity = entity;
  panelContainer.entityType = type;

  panel.container = panelContainer;

  if (addPanelCallbacks) {
    addPanelCallbacks(panel);
  }

  return panelContainer;
};

export const renderRoster = (displayRoster = null) => {
  const useRoster = displayRoster ?? roster;
  elements.panels.empty();
  useRoster.forEach((panel) => {
    elements.panels.append(panel);
  });
  setStyle();
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

export const storeWorkspace = async () => {
  window.sessionStorage.setItem('currentWorkspace', JSON.stringify(workspace));
  await window.workspace.update(workspace);
}

const applyEvents = globalAppReset(() => {
  setTimeout(resetRoster, 10);
});

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
