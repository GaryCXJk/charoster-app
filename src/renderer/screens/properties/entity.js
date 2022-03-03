import Block from "../../components/base/Block";
import input from "../../components/forms/input";
import picker from "./entity/picker";

const setEntityData = (type, entity, elements, properties) => {
  elements.displayName.value = entity.displayName ?? '';

  Object.keys(elements.fields).forEach((key) => {
    const fieldBlock = elements.fields[key];

    if (fieldBlock.reset) {
      fieldBlock.reset({
        type,
        entity,
      });
    } else {
      fieldBlock.value = entity[key] ?? '';
    }
  });
};

const makeEntityFields = async ({
  container,
  elements,
  getCurrentRoster,
  getIndex,
  properties,
}) => {
  const { doUpdate } = properties;
  const entityFields = await window.definitions.getEntityFields();
  elements.fields = {};
  Object.keys(entityFields).forEach((fieldId) => {
    const id = fieldId.replace(/[>:]/g, '-');
    const fieldData = entityFields[fieldId];

    let element = null;
    switch(fieldData.type) {
      case 'image':
      case 'svg':
      case 'image,svg':
      case 'svg,image':
        element = picker({
          id,
          label: fieldData.label,
          fieldData,
        });
        element.onInput(() => {
          const currentRoster = getCurrentRoster();
          const entity = currentRoster.roster[getIndex()];
          entity[fieldId] = element.value;
          if (!entity[fieldId]) {
            delete entity[fieldId];
          }
          doUpdate();
        });
        break;
      default:
        break;
    }
    if (element) {
      container.append(element);
      elements.fields[fieldId] = element;
    }
  });
}

export default async (properties) => {
  const { doUpdate } = properties;

  const getCurrentRoster = () => properties.workspace.rosters[properties.workspace.displayRoster];

  const container = new Block();

  const elements = {};
  let index;

  const getIndex = () => index;

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
    if (!entity.displayName) {
      delete entity.displayName;
    }
    doUpdate();
  });

  await makeEntityFields({
    container,
    elements,
    getCurrentRoster,
    getIndex,
    properties,
  });

  properties.eventTarget.addEventListener('sync-entity', (event) => {
    const { detail } = event;
    index = detail;
    const currentRoster = getCurrentRoster();
    const type = currentRoster.type;
    const entity = currentRoster.roster[index];

    setEntityData(type, entity, elements, properties);
  });

  properties.eventTarget.addEventListener('darkmode-switched', () => {
    const currentRoster = getCurrentRoster();
    const type = currentRoster.type;
    const entity = currentRoster.roster[index];

    Object.keys(elements.fields).forEach((key) => {
      const fieldBlock = elements.fields[key];

      if (fieldBlock.reset) {
        fieldBlock.reset({
          type,
          entity,
        });
      }
    });
  });

  return container;
};
