import Block from "@components/base/Block";
import { createPanel as createPanelBase } from '@components/panels/panel';
import { debounce } from "throttle-debounce";
import createWaiter from "../../../helpers/create-waiter";
import { globalAppReset } from "../../../helpers/global-on";
import { clearObject } from "../../../helpers/object-helper";
import { getEntity } from "../../components/panels/processing/entities";

let pickerContent;
let altPicker;
let queryInput;
const packs = {};
const blocks = {};
const entities = {};
const waiters = {
  characters: {},
  stages: {},
};
const packWaiters = {};
let activePanel = null;
let workspace;

const elements = {
  off: new Block(),
};

const getCurrentRoster = (currentWorkspace = null) => (currentWorkspace ?? workspace).rosters[(currentWorkspace ?? workspace).displayRoster];

const setHandlers = () => {
  window.globalEventHandler.on('entity-updated', ({type, entity: entityData}) => {
    if (!entityData) {
      return;
    }
    entities[type] = entities[type] ?? {};
    entities[type][entityData.fullId] = entityData;
    waiters[type] = waiters[type] ?? {};
    if (waiters[type][entityData.fullId]) {
      waiters[type][entityData.fullId].resolve(entityData);
    }
  });

  window.globalEventHandler.on('pack-entity-list-ready', async ({ type, packId, entityList }) => {
    const currentRoster = getCurrentRoster();
    const currentType = currentRoster.type ?? 'characters';
    if (!packs[packId]) {
      packWaiters[packId] = createWaiter();
      await packWaiters[packId];
    }
    packs[packId][type] = packs[packId][type] ?? [];
    if (packs[packId][type] === true) {
      packs[packId][type] = [];
    }
    const filteredList = entityList.filter((entityId) => !packs[packId][type].includes(entityId));
    packs[packId][type].push(...filteredList);
    if (type === currentType) {
      filteredList.forEach(blocks[packId].createPanel);
      addPackBlocks();
    }
  });

  window.globalEventHandler.on('pack-ready', (pack) => {
    if (pack) {
      const packId = pack.id;
      packs[packId] = pack;
      if (packWaiters[packId]) {
        packWaiters[packId].resolve();
        delete packWaiters[packId];
      }
      elements.off.append(createPackBlock(packId));
      addPackBlocks();
    }
  });

  window.globalEventHandler.on('sync-workspace', (newWorkspace) => {
    const shouldRefresh = getCurrentRoster().type !== getCurrentRoster(newWorkspace).type;
    workspace = newWorkspace;

    if (shouldRefresh) {
      pickerReset();
    }
  });

  queryInput.addEventListener('input', debounce(250, () => {
    addPackBlocks();
  }));
}

const getImageList = (entityId) => {
  const entityType = getCurrentRoster().type;
  const alts = [];
  const entity = entities[entityType][entityId];

  if (entity.images) {
    entity.images.forEach((alt) => {
      if (alt.images) {
        const altInfo = {
          name: alt.name ?? null,
          images: [],
          id: alt.fullId,
        }
        if (alt.group) {
          altInfo.group = alt.group;
          if (entity.groups?.[alt.group]) {
            altInfo.label = entity.groups[alt.group];
          }
        }
        for (let idx = 0; idx < alt.images.length; idx += 1) {
          altInfo.images.push(`${alt.fullId}>${idx}`);
        }
        alts.push(altInfo);
      }
    });
  }
  return alts;
}

const createPanel = (id, imageId = null) => {
  const entityType = getCurrentRoster().type;
  const panel = createPanelBase({
    type: entityType,
    entityId: id,
    imageId,
    showLabel: !imageId,
    draggable: true,
    callbacks: {
      panel: {
        dragstart: () => {
          window.panels.startDrag(id, imageId);
        },
        dragend: () => {
          window.panels.endDrag();
        },
        ...(
          !imageId && id !== null
          ? {
            click: () => {
              panel.element.classList.toggle('active');
              const isActive = panel.element.classList.contains('active');
              altPicker.element.innerHTML = '';

              if (isActive) {
                if (activePanel) {
                  activePanel.element.classList.remove('active');
                }
                activePanel = panel;

                const altGroups = {};
                const childGroups = {};

                getImageList(id).forEach((altInfo) => {
                  let altLabel = altInfo.label ?? altInfo.name ?? '';
                  let altContainer = null;
                  const groupId = altInfo.group ?? altInfo.id;
                  if (altInfo.group) {
                    const altGroup = altInfo.group;
                    altContainer = altGroups[altGroup] ?? null;
                  }
                  if (!altContainer && altInfo.group && !altInfo.label && childGroups[altInfo.group]) {
                    altContainer = childGroups[altInfo.group];
                  }
                  if (!altContainer) {
                    altContainer = new Block({
                      className: 'alt-group',
                    });
                    if (altInfo.group && !altInfo.label) {
                      childGroups[altInfo.group] = altContainer;
                    } else {
                      const altHeader = new Block({
                        className: 'header',
                        textContent: altLabel,
                      });
                      altPicker.append(altHeader);
                      altPicker.append(altContainer);
                      altGroups[groupId] = altContainer;
                      if (childGroups[groupId]) {
                        altContainer.appendChildren(childGroups[groupId]);
                        delete childGroups[groupId];
                      }
                    }
                  }
                  altInfo.images.forEach((altId) => {
                    const altPanel = createPanel(id, altId);
                    altContainer.append(altPanel);
                  });
                });
              } else {
                activePanel = null;
                createEmptyPanelPicker();
              }
            }
          }
          : {
            dblclick: () => {
              window.panels.send(id, imageId);
            }
          }
        ),
      },
      image: {
        setEntity: async (entityId) => {
          let entity = entities[entityType][entityId];

          if (!entity) {
            entities[entityType][entityId] = await window.entities.getEntity(entityType, entityId);
            entity = entities[entityType][entityId];
          }
          return entity;
        },
        setImage: ({
          entity,
        }) => {
          let altId = entity.defaultImage;

          if (!altId && entity.images) {
            entity.images.every((alt) => {
              if (alt.images && alt.images.length) {
                altId = `${alt.fullId}>0`;
                return false;
              }
              return true;
            });
          }
          return altId;
        }
      }
    },
  });

  return panel;
}

const createEmptyPanelPicker = () => {
  const emptyContainer = new Block({
    className: 'alt-group',
  });
  const emptyHeader = new Block({
    className: 'header',
    textContent: 'Empty panel',
  });
  altPicker.append(emptyHeader);
  altPicker.append(emptyContainer);
  emptyContainer.append(createPanel(null, null));
}

const createPackBlock = (packId) => {
  const currentRoster = getCurrentRoster();
  const entityType = currentRoster.type;
  const pack = packs[packId];
  const block = new Block({
    className: 'pack',
  });

  const label = new Block({
    className: 'label',
    textContent: pack.name,
  });
  block.append(label);

  const panels = new Block({
    className: 'panels',
  });
  block.append(panels);

  block.panelMap = {};

  block.visible = [];

  block.createPanel = (elementId) => {
    const panel = createPanel(elementId);
    block.panelMap[elementId] = panel;
    panel.entityId = elementId;
    block.visible.push(elementId);
    getEntity(entityType, elementId).then((entity) => {
      panel.entity = entity;
    });

    panels.append(panel);
  };

  if (Array.isArray(pack[entityType])) {
    pack[entityType].forEach(block.createPanel);
  }

  blocks[packId] = block;

  block.pack = pack;
  block.off = new Block();
  block.panels = panels;
  block.setVisibility = () => {
    if (!pack[entityType] || pack[entityType] === true) {
      return;
    }
    block.visible.splice(0, block.visible.length);
    pack[entityType].forEach((entityId) => {
      const panel = block.panelMap[entityId];
      if (!queryInput.value) {
        block.visible.push(entityId);
        panels.append(panel);
        return;
      }
      const isVisible = (panel.entity?.name ?? panel.entityId).toLowerCase().indexOf(queryInput.value.toLowerCase()) > -1;
      block[isVisible ? 'panels' : 'off'].append(panel);
      if (isVisible) {
        block.visible.push(entityId);
      }
    });
  };

  return block;
}

const addPackBlocks = () => {
  Object.keys(blocks).forEach((packId) => {
    const block = blocks[packId];

    elements.off.append(block);

    block.setVisibility();

    if (block.visible.length) {
      pickerContent.append(block);
    }
  });
}

const initPickerContent = async () => {
  workspace = await window.workspace.retrieve();
  const currentRoster = getCurrentRoster();
  const entityType = currentRoster.type;
  entities[entityType] = entities[entityType] ?? {};
  const fetchPacks = await window.packs.getPackList();
  const fetchEntities = await window.entities.getEntityList(entityType);

  Object.assign(packs, fetchPacks);
  Object.assign(entities[entityType], fetchEntities);

  Object.keys(fetchPacks).forEach((packId) => {
    elements.off.append(createPackBlock(packId));
  });

  addPackBlocks();
  createEmptyPanelPicker();
}

const pickerReset = () => {
  clearObject(packs);
  clearObject(blocks);
  clearObject(entities);
  clearObject(waiters);
  activePanel = null;
  elements.off.empty();
  pickerContent.empty();
  altPicker.empty();
  queryInput.value = '';
  initPickerContent();
};

let applyEvents = globalAppReset(pickerReset);

export default (queryInputElement, altPickerElement) => {
  applyEvents();
  pickerContent = new Block({
    className: 'content',
  });

  queryInput = queryInputElement;
  altPicker = altPickerElement;

  setHandlers();
  initPickerContent();

  return pickerContent;
}
