import Block from "../../components/base/Block";
import input from "../../components/forms/input";
import switchEl from "../../components/forms/switch";
import picker from "./entity/picker";
import { getEntity } from "../../components/panels/processing/entities";
import getPanelProps, { extractDefaultValue } from "../../common/getPanelProps";

const setEntityData = (type, entity, elements, properties) => {
  elements.displayName.value = entity.displayName ?? '';

  Object.keys(elements.fields).forEach((key) => {
    const fieldBlock = elements.fields[key];

    if (fieldBlock.reset) {
      fieldBlock.reset({
        type,
        entity,
        value: entity[key] ?? '',
      });
    } else {
      fieldBlock.value = entity[key] ?? '';
    }
  });
  elements.properties.reset({
    type,
    entity,
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

const makeProperties = ({
  container,
  getCurrentRoster,
  getIndex,
  properties,
}) => {
  const block = new Block({
    className: 'properties',
  });
  container.append(block);
  block.reset = async ({
    type,
    entity,
  }) => {
    block.empty();
    const entityInfo = await getEntity(type, entity.entityId);
    const designProperties = await window.designs.getThemePanelProperties(properties?.workspace?.theme);
    if (designProperties) {
      const filteredProperties = Object.keys(designProperties).reduce((acc, prop) => {
        if (designProperties[prop]?.include.includes(type)) {
          return {
            ...acc,
            [prop]: designProperties[prop],
          };
        }
        return acc;
      }, {});
      Object.keys(filteredProperties).forEach((prop) => {
        const propData = filteredProperties[prop];
        let propElement = null;
        switch (propData.type) {
          case 'boolean':
            propElement = switchEl({
              id: `property-${prop}`,
              label: propData.label ?? prop,
            });
            break;
          default:
            propElement = input({
              id: `property-${prop}`,
              label: propData.label ?? prop,
              placeholder: propData.placeholder ?? '',
            });
            break;
        }
        let propValue = getPanelProps(entity, entityInfo, prop, propData);
        if (propValue !== null) {
          switch (propData.type) {
            case 'boolean':
              propElement.checked = !!propValue;
              break;
            default:
              propElement.value = propValue;
              break;
          }
        }
        propElement.onInput(() => {
          const currentRoster = getCurrentRoster();
          const newEntity = currentRoster.roster[getIndex()];
          if (!newEntity.properties) {
            newEntity.properties = {};
          }
          switch (propData.type) {
            case 'boolean':
              newEntity.properties[prop] = !!propElement.checked;
              if (newEntity.properties[prop] === extractDefaultValue(propData, entityInfo)) {
                delete newEntity.properties[prop];
              }
              break;
            default:
              newEntity.properties[prop] = propElement.value;
              if (!newEntity.properties[prop]) {
                delete newEntity.properties[prop];
              }
              break;
          }
          properties.doUpdate();
        });
        block.append(propElement);
      });
    }
  }
  return block;
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

  elements.properties = makeProperties({
    container,
    getCurrentRoster,
    getIndex,
    properties,
  });
  container.append(elements.properties);

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
