import Block from "../../components/base/Block";
import input from "../../components/forms/input";

const setEntityData = (type, entity, elements, properties) => {
  elements.displayName.value = entity.displayName ?? '';
};

export default async (properties) => {
  const { doUpdate } = properties;

  const getCurrentRoster = () => properties.workspace.rosters[properties.workspace.displayRoster];

  const container = new Block();

  const elements = {};
  let index;

  const displayNameInput = input({
    id: 'displayName',
    label: 'Display name',
    placeholder: 'Display name',
  });
  container.append(displayNameInput);
  elements.displayName = displayNameInput;
  displayNameInput.onInput(() => {
    const currentRoster = getCurrentRoster();
    const entity = currentRoster.roster[index];
    entity.displayName = displayNameInput.value;
    doUpdate();
  });

  properties.eventTarget.addEventListener('sync-entity', (event) => {
    const { detail } = event;
    index = detail;
    const currentRoster = getCurrentRoster();
    const type = currentRoster.type;
    const entity = currentRoster.roster[index];

    setEntityData(type, entity, elements, properties);
  });

  return container;
};
