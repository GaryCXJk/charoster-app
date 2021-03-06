import titlebar from '@components/titlebar';
import Block from '@components/base/Block';
import './main.scss';
import mdiFileOpen from '@material-design-icons/svg/two-tone/file_open.svg';
import mdiInsertPhoto from '@material-design-icons/svg/two-tone/insert_photo.svg';
import mdiNoteAdd from '@material-design-icons/svg/two-tone/note_add.svg';
import mdiRefresh from '@material-design-icons/svg/two-tone/refresh.svg';
import mdiSave from '@material-design-icons/svg/two-tone/save.svg';
import mdiSaveAs from '@material-design-icons/svg/two-tone/save_as.svg';
import createPanelScreen, {
  addPanel,
  getCurrentRoster,
  setCurrentWorkspace,
  getRoster,
  resetRoster,
  setRoster,
  storeWorkspace,
  awaitSetup,
  setStyle,
  getCurrentWorkspace,
  getSelection,
  clearSelection,
  setPreview,
} from '../../components/panels/panelscreen';
import mdi from '../../../helpers/mdi';

let dragInfo = null;
let isDragEnter = false;
let dragLevel = 0;

let placeholder = null;
let placeholderRoster = null;

const updateActions = {
  theme: ['style', 'selection', 'preview'],
  displayRoster: ['style', 'selection', 'preview'],
};
const updateRosterActions = {
  type: ['style', 'selection', 'preview'],
}

const actions = {
  create: async () => {
    const newWorkspace = await window.workspace.create();
    if (newWorkspace) {
      setCurrentWorkspace(newWorkspace, true, true);
    }
  },
  open: async () => {
    const newWorkspace = await window.workspace.load();
    if (newWorkspace) {
      setCurrentWorkspace(newWorkspace, true, true);
    }
  },
};

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

  window.globalEventHandler.on('sync-workspace', async (newWorkspace) => {
    const { index, panel } = getSelection();
    const workspace = await getCurrentWorkspace();

    const needsUpdate = {};

    Object.keys(updateActions).forEach((prop) => {
      if (workspace[prop] !== newWorkspace[prop]) {
        updateActions[prop].forEach((action) => {
          needsUpdate[action] = true;
        });
      }
    });

    const prevRoster = workspace.rosters[workspace.displayRoster];
    const newRoster = newWorkspace.rosters[newWorkspace.displayRoster];

    if (workspace.displayRoster === newWorkspace.displayRoster) {
      Object.keys(updateRosterActions).forEach((prop) => {
        if (prevRoster[prop] !== newRoster[prop]) {
          updateRosterActions[prop].forEach((action) => {
            needsUpdate[action] = true;
          });
        }
      });
    }

    if (index > -1) {
      if (needsUpdate.selection) {
        clearSelection();
      } else {
        const newEntity = newRoster.roster[index];
        panel.update(newEntity);
        setPreview(newRoster.type, newEntity);
      }
    }

    setCurrentWorkspace(newWorkspace, 'noUpdate', needsUpdate.style, needsUpdate.preview ?? false);
  });

  window.globalEventHandler.on('send-panel', (entity) => {
    const currentRoster = getCurrentRoster();

    currentRoster.roster.push(entity);
    getRoster().push(addPanel(currentRoster.type, entity));
    resetRoster();
    storeWorkspace();
  });

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
      switch (e.key) {
        case 'n':
          e.preventDefault();
          actions.create();
          break;
        case 'o':
          e.preventDefault();
          actions.open();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          window.workspace.save(e.key === 'S');
          break;
        default:
          break;
      }
    }
  });
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

  const elements = createPanelScreen({
    panels: {
      on: {
        drop: async (event) => {
          await awaitSetup();
          if (dragInfo) {
            event.preventDefault();

            const currentRoster = getCurrentRoster();
            placeholder.css({
              opacity: null,
            });
            const roster = getRoster();
            roster.splice(placeholder.index(), 0, placeholder);
            setRoster(roster);
            currentRoster.roster.splice(placeholder.index(), 0, placeholder.entity);
            storeWorkspace();
            resetRoster();
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
                placeholderRoster = [...getRoster()];
              }
              placeholderRoster.push(placeholder);
              elements.panels.append(placeholder);
              setStyle(placeholderRoster);
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
                placeholderRoster = [...getRoster()];
              }
              placeholder.detach();
            }
          }
        },
      },
    },
    onAddPanel: (panel) => {
      panel.prop('draggable', true);

      panel.on('dragstart', () => {
        const {
          entityId: panelId,
          ...restInfo
        } = panel.container.entity;

        dragInfo = {
          ...restInfo,
          panelId,
        };
        const currentRoster = getCurrentRoster();
        placeholder = panel.container;
        const roster = getRoster();
        roster.splice(panel.container.index(), 1);
        setRoster(roster);
        currentRoster.roster.splice(panel.container.index(), 1);
        placeholderRoster = [...getRoster()];

        placeholder.css({
          opacity: 0.5,
        });

        clearSelection();

        storeWorkspace();
      });
      panel.on('dragend', () => {
        if (!isDragEnter) {
          dragInfo = null;
          placeholder = null;
          placeholderRoster = null;
        }
      });
      panel.on('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentIndex = panel.container.index();
        const placeholderIndex = placeholder.index();
        if (currentIndex !== placeholderIndex) {
          placeholderRoster = [
            ...getRoster().slice(0, currentIndex),
            placeholder,
            ...getRoster().slice(currentIndex),
          ];
          const currentBlock = getRoster()[currentIndex];
          if (currentBlock) {
            currentBlock.insertBefore(placeholder);
          } else {
            elements.panels.append(placeholder);
          }
          setStyle(placeholderRoster);
        }
      });
    },
  });

  const container = new Block({
    className: 'sections',
  });

  const titlebarElem = titlebar({
    hasIcon: true,
    buttons: [
      {
        content: mdi(mdiNoteAdd),
        title: 'New workspace',
        on: {
          click: actions.create,
        },
      },
      {
        content: mdi(mdiSave),
        title: 'Save workspace',
        on: {
          click: () => {
            window.workspace.save();
          }
        }
      },
      {
        content: mdi(mdiSaveAs),
        title: 'Save workspace as...',
        on: {
          click: () => {
            window.workspace.save(true);
          }
        }
      },
      {
        content: mdi(mdiFileOpen),
        title: 'Open workspace',
        on: {
          click: actions.open,
        }
      },
      'divider',
      {
        content: mdi(mdiInsertPhoto),
        on: {
          click: async () => {
            await window.workspace.exportImage();
          }
        }
      },
      {
        content: mdi(mdiRefresh),
        on: {
          click: () => {
            window.app.reset();
          }
        }
      },
      'divider',
    ],
  });
  container.append(titlebarElem);

  container.append(elements.content);
  container.append(elements.preview);
  container.append(elements.style);

  return container.element;
}
