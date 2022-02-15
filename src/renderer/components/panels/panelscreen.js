import Block from '@components/base/Block';
import { createPanel, getImage } from './panel';
import funcs from './funcs';
import { createDesignQueue, createStylesheet } from './panelstyle';

let workspace = {};
const entities = {
  characters: {},
  stages: {},
};

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

const getEntity = async (type, entityId) => {
  entities[type] = entities[type] ?? {};

  switch (type) {
    case 'characters':
      entities[type][entityId] = await window.characters.getCharacter(entityId);
      break;
    default:
      break;
  }
  return entities[type][entityId];
};

const getImageId = (type, entity) => {
  let imageId = null;
  if (funcs[type] && funcs[type].getImageId) {
    imageId = funcs[type].getImageId(entity);
  }

  return imageId;
};

const createPreviewImage = () => {
  const container = new Block({
    className: 'image-container',
  });

  const image = new Block({
    className: 'image',
  });
  container.append(image);

  container.setImage = async (type, entity) => {
    const { entityId } = entity;
    const entityInfo = await getEntity(type, entityId);
    const imageId = entity.imageId ?? getImageId(type, entityInfo);

    const imageData = await getImage(type, imageId, getDesignId());

    image.css({
      backgroundImage: `url(${imageData.preview.data})`,
    });
  };

  container.clearImage = () => {
    image.css({
      backgroundImage: null,
    });
  };

  return container;
};

const createPreviewElements = (preview) => {
  const image = createPreviewImage();
  preview.append(image);

  preview.image = image;
};

const clearPreview = () => {
  elements.preview.image.clearImage();
}

const setPreview = (type, entity) => {
  elements.preview.image.setImage(type, entity);
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

export default ({
  panels: panelsOptions = {},
  onAddPanel = null,
} = {}) => {
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
