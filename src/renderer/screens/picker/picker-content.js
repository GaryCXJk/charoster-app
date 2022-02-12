import Block from "@components/base/Block";
import createWaiter from "@@helpers/create-waiter";

let pickerContent;
const packs = {};
const blocks = {};
const characters = {};

const imageQueue = [];

let queueRunning = false;

const waiters = {
  costumes: {},
};

window.globalEventHandler.on('character-updated', (...args) => {
  console.log(args);
});

const runImageQueue = async () => {
  if (queueRunning) {
    return;
  }
  queueRunning = true;

  while (imageQueue.length) {
    const imageId = imageQueue.shift();

    const imageData = await window.characters.getImages(imageId);
    waiters.costumes[imageId].resolve(imageData);
  }

  queueRunning = false;
};

const queueImage = (imageId) => {
  imageQueue.push(imageId);
  runImageQueue();
};

const setPanelImage = async (panel, charId) => {
  const panelImage = new Block({
    className: 'image',
  });
  panel.append(panelImage);

  const character = characters[charId];

  if (!character) {
    // TODO: Wait for character information.
  }

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
  if (costumeId) {
    const waiter = createWaiter();
    waiters.costumes[costumeId] = waiter;

    queueImage(costumeId);

    const imageData = await waiter;

    if (imageData) {
      panelImage.element.style.backgroundImage = `url(${imageData.panel})`;
    }
  }
};

const createPanel = (charId) => {
  const panel = new Block({
    className: 'panel',
  });

  setPanelImage(panel, charId);

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

export default () => {
  pickerContent = new Block({
    className: 'content',
  });

  initPickerContent(pickerContent);

  return pickerContent;
}
