import { globalAppReset } from "../../../../helpers/global-on";

const entities = {
  characters: {},
  stages: {},
};

export const getEntityObject = () => entities;

let applyEvents = globalAppReset(() => {
  entities.characters = {};
  entities.stages = {};
});

export const getEntity = async (type, entityId) => {
  applyEvents();
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
