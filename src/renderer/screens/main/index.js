import titlebar from '@components/titlebar';
import Block from '@components/base/Block';
import { createPanel, getImage } from '@components/panels/panel';
import './main.scss';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { faCopy, faFolderOpen, faSave } from '@fortawesome/free-solid-svg-icons';

let dragInfo = null;
let isDragEnter = false;
let dragLevel = 0;
let workspace = {};
const entities = {
  characters: {},
  stages: {},
};

let roster = [];
const elements = {};
let placeholder = null;
let placeholderRoster = null;

let activePanel = null;

const setHandlers = () => {
  window.globalEventHandler.on('drag-helper-info', (detail) => {
    dragInfo = detail;
    clearSelection();
  });

  window.globalEventHandler.on('drag-helper-done', () => {
    if (!isDragEnter) {
      dragInfo = null;
      placeholder = null;
      placeholderRoster = null;
    }
  });
}

const getCurrentRoster = () => workspace.rosters[workspace.displayRoster];

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

const getCharacterImageId = (character) => {
  let costumeId = character.defaultCostume;

  if (!costumeId && character.costumes && character.costumes) {
    character.costumes.every((costume) => {
      if (costume.images && costume.images.length) {
        costumeId = `${costume.fullId}>0`;
        return false;
      }
      return true;
    });
  }

  return costumeId;
}

const getImageId = (type, entity) => {
  let imageId = null;
  switch (type) {
    case 'characters':
      imageId = getCharacterImageId(entity);
      break;
    default:
      break;
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

const addPanel = (type, entity) => {
  const panelContainer = new Block({
    className: 'panel-container',
  });

  const panel = createPanel({
    type: type,
    draggable: true,
    ...entity,
    callbacks: {
      panel: {
        click: () => {
          setSelection(panelContainer);
        },
        dragstart: () => {
          const {
            entityId: panelId,
            ...restInfo
          } = panelContainer.entity;

          dragInfo = {
            ...restInfo,
            panelId,
          };
          const currentRoster = getCurrentRoster();
          placeholder = panelContainer;
          roster.splice(panelContainer.index(), 1);
          currentRoster.roster.splice(panelContainer.index(), 1);
          placeholderRoster = [...roster];

          placeholder.css({
            opacity: 0.5,
          });

          clearSelection();

          storeWorkspace();
        },
        dragend: () => {
          if (!isDragEnter) {
            dragInfo = null;
            placeholder = null;
            placeholderRoster = null;
          }
        },
        dragover: (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentIndex = panelContainer.index();
          const placeholderIndex = placeholder.index();
          if (currentIndex !== placeholderIndex) {
            placeholderRoster = [
              ...roster.slice(0, currentIndex),
              placeholder,
              ...roster.slice(currentIndex),
            ];
            renderRoster(placeholderRoster);
          }
        }
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

  return panelContainer;
};

const renderRoster = (displayRoster = null) => {
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

const storeWorkspace = async () => {
  window.sessionStorage.setItem('currentWorkspace', JSON.stringify(workspace));
  await window.workspace.update(workspace);
}

const convertEntity = () => {
  const {
    panelId: entityId,
    ...restInfo
  } = dragInfo;

  return {
    entityId,
    ...restInfo
  };
}

export default () => {
  setHandlers();

  const setupPromise = setupWorkspace();

  const container = document.createElement('div');
  container.className = 'sections';

  container.appendChild(titlebar({
    hasIcon: true,
    buttons: [
      {
        content: icon(faSave).node,
        on: {
          click: () => {
            window.workspace.save();
          }
        }
      },
      {
        content: icon(faCopy).node,
        on: {
          click: () => {
            window.workspace.save(true);
          }
        }
      },
      {
        content: icon(faFolderOpen).node,
        on: {
          click: async () => {
            const newWorkspace = await window.workspace.load();
            if (newWorkspace) {
              workspace = newWorkspace;
              storeWorkspace();
              prepareRoster();
              renderRoster();
            }
          }
        }
      },
      'divider',
    ],
  }).element);

  const content = new Block({
    className: 'content',
  });
  container.appendChild(content.element);

  const panels = new Block({
    className: 'panels',
    on: {
      drop: async (event) => {
        await setupPromise;
        if (dragInfo) {
          event.preventDefault();

          const currentRoster = getCurrentRoster();
          placeholder.css({
            opacity: null,
          });
          roster.splice(placeholder.index(), 0, placeholder);
          currentRoster.roster.splice(placeholder.index(), 0, placeholder.entity);
          storeWorkspace();
          setStyle();
          renderRoster();
        }
        isDragEnter = false;
        dragInfo = null;
        dragLevel = 0;
        placeholder = null;
        placeholderRoster = null;
      },
      dragover: (event) => {
        if (dragInfo) {
          event.preventDefault();
        }
      },
      dragenter: () => {
        if (!dragLevel) {
          if (dragInfo) {
            const currentRoster = getCurrentRoster();
            if (!placeholder) {
              const entity = convertEntity();

              placeholder = addPanel(currentRoster.type, entity);
              placeholder.css({
                opacity: 0.5,
              });
              placeholder.entity = entity;
            }
            if (!placeholderRoster) {
              placeholderRoster = [...roster];
            }
            placeholderRoster.push(placeholder);
            renderRoster(placeholderRoster);
          }
          isDragEnter = true;
        }
        dragLevel += 1;
      },
      dragleave: () => {
        dragLevel -= 1;
        if (!dragLevel) {
          isDragEnter = false;
          if (dragInfo) {
            if (placeholderRoster) {
              placeholderRoster = [...roster];
              renderRoster(placeholderRoster);
            } else {
              placeholder.detach();
            }
          }
        }
      },
    },
  });
  content.append(panels);

  const preview = new Block({
    className: 'preview',
  });
  container.appendChild(preview.element);

  createPreviewElements(preview);

  const style = document.createElement('style');
  container.appendChild(style);

  elements.panels = panels;
  elements.preview = preview;
  elements.style = style;

  setupPromise.then(() => {
    setStyle();
    prepareRoster();
  });

  return container;
}
