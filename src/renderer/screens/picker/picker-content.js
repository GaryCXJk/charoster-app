import Block from "@components/base/Block";
import { createPanel as createPanelBase } from '@components/panels/panel';

let pickerContent;
let costumePicker;
const packs = {};
const blocks = {};
const characters = {};
const waiters = {};
let activePanel = null;

window.globalEventHandler.on('character-updated', (characterData) => {
  characters[characterData.fullId] = characterData;
  if (waiters[characterData.fullId]) {
    waiters[characterData.fullId].resolve(characterData);
  }
});

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

  pack.characters.forEach((charId) => {
    const panel = createPanel(charId);

    panels.append(panel);
  });

  blocks[packId] = block;

  return block;
}

const initPickerContent = async (pickerContent) => {
  const fetchPacks = await window.packs.getPackList();
  const fetchCharacters = await window.characters.getCharacterList();

  Object.assign(packs, fetchPacks);
  Object.assign(characters, fetchCharacters);

  Object.keys(fetchPacks).forEach((packId) => {
    pickerContent.append(createPackBlock(packId));
  });
}

export default (costumePickerElement) => {
  pickerContent = new Block({
    className: 'content',
  });

  costumePicker = costumePickerElement;

  initPickerContent(pickerContent);

  return pickerContent;
}
