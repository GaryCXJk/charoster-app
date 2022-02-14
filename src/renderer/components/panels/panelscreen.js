import Block from '@components/base/Block';
import { createPanel, getImage } from './panel';
import funcs from './funcs';
import './panelscreen.scss';

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

export const setCurrentWorkspace = (newWorkspace) => {
  workspace = newWorkspace;
  storeWorkspace();
  resetRoster();
}

export const getCurrentWorkspace = async () => {
  await setupPromise;
  return workspace;
};

export const getCurrentRoster = () => workspace.rosters[workspace.displayRoster];

const getDynamicStyleProperties = (returnStyle) => {
  const currentRoster = getCurrentRoster();
  let { width, height, meta = {} } = currentRoster;

  let rowColRatio = [height, width];
  if (meta.rowColRatio && Array.isArray(meta.rowColRatio)) {
    rowColRatio[0] = meta.rowColRatio[0] ?? rowColRatio[0];
    rowColRatio[1] = (meta.rowColRatio[1] ?? rowColRatio[1]) || 1;
  }
  const rcRatio = rowColRatio[0] / rowColRatio[1];

  let totalCells = width * height;

  while ((placeholderRoster ?? roster).length > totalCells) {
    const ratio = height / width;
    if (ratio > rcRatio) {
        width++;
    } else {
        height++;
    }
    totalCells = width * height;
  }

  returnStyle.panels = {
    width: `${100 / width}%`,
    height: `${100 / height}%`,
  };
}

const getStyleProperties = () => {
  const returnStyle = {};
  const currentRoster = getCurrentRoster();
  returnStyle.alignment = {
    horizontal: 'center',
    vertical: 'center',
    ...(currentRoster.alignment ?? {})
  };

  if (returnStyle.alignment.horizontal === 'left') {
    returnStyle.alignment.horizontal = 'start';
  }

  if (returnStyle.alignment.vertical === 'top') {
    returnStyle.alignment.vertical = 'start';
  }

  switch (currentRoster.mode) {
    case 'dynamic':
    default:
      getDynamicStyleProperties(returnStyle);
      break;
  }
  return returnStyle;
}

const processCSSFilters = (filters) => {
  const processedFilters = [];

  filters.forEach((filter) => {
    const { type, value } = filter;
    let processedValue = [];
    switch (type) {
      case 'drop-shadow':
        processedValue.push(value.x, value.y);
        if (value.radius) {
          processedValue.push(value.radius);
        }
        if (value.color) {
          processedValue.push(value.color);
        }
        break;
      default:
        break;
    }
    processedFilters.push(`${type}(${processedValue.join(' ')})`);
  });
  return processedFilters.join(' ');
};

const setStyle = async () => {
  const design = await window.designs.get();
  const rosterStyle = getStyleProperties();

  const panelImageFilters = processCSSFilters(design.panels.image.filters);
  const previewImageFilters = processCSSFilters(design.preview.image.filters);

  const stylesheet = `
#app.main .content {
  padding: ${design.panels.margin};
}

#app.main .panels {
  justify-content: ${rosterStyle.alignment.horizontal};
  align-content: ${rosterStyle.alignment.vertical};
}

#app.main .panels .panel-container {
  width: ${rosterStyle.panels.width};
  height: ${rosterStyle.panels.height};
  padding: ${design.panels.gap};
}

#app.main .panels .panel .image {${
  panelImageFilters ? `filter: ${panelImageFilters};` : ''
}
}

#app.main .preview .image {${
  previewImageFilters ? `filter: ${previewImageFilters};` : ''
}
}
`;
  elements.style.innerHTML = stylesheet;
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

    const imageData = await getImage(type, imageId);

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
}) => {
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
