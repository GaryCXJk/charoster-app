import Block from "@components/base/Block";
import { createPanel as createPanelBase } from '@components/panels/panel';

let pickerContent;
let costumePicker;
const packs = {};
const blocks = {};
const characters = {};
const waiters = {};
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
    pack.characters = [];
    elements.off.append(createPackBlock(packId));
    addPackBlocks();
  });

  window.globalEventHandler.on('pack-character-list-ready', (data) => {
    const {
      packId,
      characters,
    } = data;
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

                getCostumeList(charId).forEach((costumeInfo) => {
                  const costumeHeader = new Block({
                    className: 'header',
                    textContent: costumeInfo.name ?? '',
                  });
                  costumePicker.append(costumeHeader);
                  costumeInfo.images.forEach((costumeId) => {
                    const costumePanel = createPanel(charId, costumeId);
                    costumePicker.append(costumePanel);
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
  setHandlers();

  const fetchPacks = await window.packs.getPackList();
  const fetchCharacters = await window.characters.getCharacterList();
  console.log(fetchPacks, fetchCharacters);

  Object.assign(packs, fetchPacks);
  Object.assign(characters, fetchCharacters);

  Object.keys(fetchPacks).forEach((packId) => {
    elements.off.append(createPackBlock(packId));
  });

  addPackBlocks();
}

export default (costumePickerElement) => {
  pickerContent = new Block({
    className: 'content',
  });

  costumePicker = costumePickerElement;

  initPickerContent();

  return pickerContent;
}
