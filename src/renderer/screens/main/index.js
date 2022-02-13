import titlebar from '@components/titlebar';
import Block from '@components/base/Block';
import { createPanel } from '@components/panels/panel';
import './main.scss';

let dragInfo = null;
let isDragEnter = false;
let workspace = {};
const characters = {};
const entities = {
  characters: {},
  stages: {},
};

let roster = [];
const elements = {};

window.globalEventHandler.on('drag-helper-info', (detail) => {
  dragInfo = detail;
});

window.globalEventHandler.on('drag-helper-done', () => {
  if (!isDragEnter) {
    dragInfo = null;
  }
});

const getCurrentRoster = () => workspace.rosters[workspace.displayRoster];

const getDynamicStyleProperties = (currentRoster, returnStyle) => {
  let { width, height, meta = {} } = currentRoster;

  let rowColRatio = [height, width];
  if (meta.rowColRatio && Array.isArray(meta.rowColRatio)) {
    rowColRatio[0] = meta.rowColRatio[0] ?? rowColRatio[0];
    rowColRatio[1] = (meta.rowColRatio[1] ?? rowColRatio[1]) || 1;
  }
  const rcRatio = rowColRatio[0] / rowColRatio[1];

  let totalCells = width * height;

  while (roster.length > totalCells) {
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
      getDynamicStyleProperties(currentRoster, returnStyle);
      break;
  }
  return returnStyle;
}

const setStyle = () => {
  const design = {
    panels: {
      gap: '0.25em',
    }
  }; // TODO: Use design manager to manage design
  const rosterStyle = getStyleProperties();

  const stylesheet = `
#app.main .panels {
  justify-content: ${rosterStyle.alignment.horizontal};
  align-content: ${rosterStyle.alignment.vertical};
}

#app.main .panels .panel-container {
  width: ${rosterStyle.panels.width};
  height: ${rosterStyle.panels.height};
  padding: ${design.panels.gap};
}
`;
  elements.style.innerHTML = stylesheet;
};

const addPanel = (entity) => {
  const panelContainer = new Block({
    className: 'panel-container',
  });

  const panel = createPanel({
    type: 'characters',
    ...entity,
    callbacks: {
      image: {
        setEntity: async (entityId) => {
          let character = characters[entityId];

          if (!character) {
            characters[entityId] = await window.characters.getCharacter(entityId);
            character = characters[entityId];
          }
          return character;
        },
        setImage: ({
          entity: character,
        }) => {
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
      }
    },
  });
  panelContainer.append(panel);

  return panelContainer;
};

const prepareRoster = () => {
  const currentRoster = workspace.rosters[workspace.displayRoster];
  currentRoster.roster.forEach((entity) => {
    const panel = addPanel(entity);
    roster.push(panel);
    elements.panels.append(panel);
  });
};

const setupWorkspace = async () => {
  workspace = await window.workspace.retrieve();
  console.log(workspace);
}

export default () => {
  const setupPromise = setupWorkspace();

  const container = document.createElement('div');
  container.className = 'sections';

  container.appendChild(titlebar({
    hasIcon: true,
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

          const {
            panelId: entityId,
            ...restInfo
          } = dragInfo;

          const entity = {
            entityId,
            ...restInfo
          };

          workspace.rosters[workspace.displayRoster].roster.push(entity);
          const panel = addPanel(entity);
          roster.push(panel);
          panels.append(panel);
          setStyle();
        }
        isDragEnter = false;
        dragInfo = null;
      },
      dragover: (event) => {
        if (dragInfo) {
          event.preventDefault();
        }
      },
      dragenter: () => {
        isDragEnter = true;
      },
      dragleave: () => {
        isDragEnter = false;
      },
    },
  });
  content.append(panels);

  const preview = document.createElement('div');
  preview.className = 'preview';
  container.appendChild(preview);

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
