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

  entities[type][entityId] = await window.entities.getEntity(type, entityId);
  return entities[type][entityId];
};
