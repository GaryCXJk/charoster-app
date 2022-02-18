import Block from "@components/base/Block";
import { createPanel as createPanelBase } from '@components/panels/panel';
import createWaiter from "../../../helpers/create-waiter";
import { globalAppReset } from "../../../helpers/global-on";
import { clearObject } from "../../../helpers/object-helper";
import { getEntity } from "../../components/panels/processing/entities";

let pickerContent;
let costumePicker;
const packs = {};
const blocks = {};
const characters = {};
const waiters = {};
const packWaiters = {};
let activePanel = null;

let query = '';

const elements = {
  off: new Block(),
};

const setHandlers = () => {
  window.globalEventHandler.on('character-updated', (characterData) => {
    characters[characterData.fullId] = characterData;
    if (waiters[characterData.fullId]) {
      waiters[characterData.fullId].resolve(characterData);
    }
  });

  window.globalEventHandler.on('pack-ready', (pack) => {
    const packId = pack.id;
    packs[packId] = pack;
    if (packWaiters[packId]) {
      packWaiters[packId].resolve();
      delete packWaiters[packId];
    }
    pack.characters = [];
    elements.off.append(createPackBlock(packId));
    addPackBlocks();
  });

  window.globalEventHandler.on('pack-character-list-ready', async (data) => {
    const {
      packId,
      characters,
    } = data;
    if (!packs[packId]) {
      packWaiters[packId] = createWaiter();
      await packWaiters[packId];
    }
    packs[packId].characters.push(...characters);
    characters.forEach((charId) => {
      const panel = createPanel(charId);

      blocks[packId].panels.append(panel);
    });
    addPackBlocks();
  });
}

const getCostumeList = (charId) => {
  const costumes = [];
  const character = characters[charId];

  if (character.costumes) {
    character.costumes.forEach((costume) => {
      if (costume.images) {
        const costumeInfo = {
          name: costume.name ?? null,
          images: [],
        }
        if (costume.group) {
          costumeInfo.group = costume.group;
          if (character.groups?.[costume.group]) {
            costumeInfo.label = character.groups[costume.group];
          }
        }
        for (let idx = 0; idx < costume.images.length; idx += 1) {
          costumeInfo.images.push(`${costume.fullId}>${idx}`);
        }
        costumes.push(costumeInfo);
      }
    });
  }
  return costumes;
}

const createPanel = (charId, imageId = null) => {
  const panel = createPanelBase({
    type: 'characters',
    entityId: charId,
    imageId,
    showLabel: !imageId,
    draggable: true,
    callbacks: {
      panel: {
        dragstart: () => {
          window.panels.startDrag(charId, imageId);
        },
        dragend: () => {
          window.panels.endDrag();
        },
        ...(
          !imageId
          ? {
            click: () => {
              panel.element.classList.toggle('active');
              const isActive = panel.element.classList.contains('active');
              costumePicker.element.innerHTML = '';

              if (isActive) {
                if (activePanel) {
                  activePanel.element.classList.remove('active');
                }
                activePanel = panel;

                const costumeGroups = {};

                getCostumeList(charId).forEach((costumeInfo) => {
                  let costumeLabel = costumeInfo.label ?? costumeInfo.name ?? '';
                  let costumeContainer = null;
                  if (costumeInfo.group) {
                    const costumeGroup = costumeInfo.group;
                    costumeContainer = costumeGroups[costumeGroup] ?? null;
                  }
                  if (!costumeContainer) {
                    const costumeHeader = new Block({
                      className: 'header',
                      textContent: costumeLabel,
                    });
                    costumePicker.append(costumeHeader);
                    costumeContainer = new Block({
                      className: 'costume-group',
                    });
                    costumePicker.append(costumeContainer);
                    if (costumeInfo.group) {
                      costumeGroups[costumeInfo.group] = costumeContainer;
                    }
                  }
                  costumeInfo.images.forEach((costumeId) => {
                    const costumePanel = createPanel(charId, costumeId);
                    costumeContainer.append(costumePanel);
                  });
                });
              } else {
                activePanel = null;
              }
            }
          }
          : {}
        ),
      },
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

  return panel;
}

const createPackBlock = (packId) => {
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

  if (Array.isArray(pack.characters)) {
    pack.characters.forEach((charId) => {
      const panel = createPanel(charId);

      panels.append(panel);
    });
  }

  blocks[packId] = block;

  block.pack = pack;
  block.off = new Block();
  block.panels = panels;

  return block;
}

const addPackBlocks = () => {
  Object.keys(blocks).forEach((packId) => {
    const block = blocks[packId];

    elements.off.append(block);

    if (Array.isArray(block.pack.characters) && block.pack.characters.length) {
      pickerContent.append(block);
    }
  });
}

const initPickerContent = async () => {
  const fetchPacks = await window.packs.getPackList();
  const fetchCharacters = await window.characters.getCharacterList();

  Object.assign(packs, fetchPacks);
  Object.assign(characters, fetchCharacters);

  Object.keys(fetchPacks).forEach((packId) => {
    elements.off.append(createPackBlock(packId));
  });

  addPackBlocks();
}

let applyEvents = globalAppReset(() => {
  clearObject(packs);
  clearObject(blocks);
  clearObject(characters);
  clearObject(waiters);
  activePanel = null;
  elements.off.empty();
  pickerContent.empty();
  costumePicker.empty();
  initPickerContent();
});

export default (costumePickerElement) => {
  applyEvents();
  pickerContent = new Block({
    className: 'content',
  });

  costumePicker = costumePickerElement;

  setHandlers();
  initPickerContent();

  return pickerContent;
}
