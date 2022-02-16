const entities = {
  characters: {},
  stages: {},
};

export const getEntityObject = () => entities;

export const getEntity = async (type, entityId) => {
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
