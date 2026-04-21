import params from "../../helpers/params";
import getPanelProps from "./getPanelProps";

const filterByLayer = ({
  filters,
  entity,
  panelEntity,
  type,
  panelProperties = {},
  mode = 'and',
}) => {
  let m = ['and', 'or'].includes(mode.toLowerCase()) ? mode.toLowerCase() : 'and';
  let returnValue = m === 'and' ? true : false;
  const combineReturns = {
    and(next) {
      returnValue = returnValue && next;
    },
    or(next){
      returnValue = returnValue || next;
    },
  }[m];
  for (let idx = 0; idx < filters.length; idx += 1) {
    const filter = filters[idx];
    const comparison = filter.comparison ?? 'equals';
    switch (filter.type) {
      case 'and':
      case 'or':
        combineReturns(filterByLayer({
          filters: filter.filters ?? [],
          entity,
          panelEntity,
          type,
          panelProperties,
          mode: filter.type
        }));
        break;
      case 'meta':
        switch (comparison) {
          case 'equals':
            combineReturns(entity?.meta?.[filter.field] === filter.value);
            break;
          case 'not-equals':
            combineReturns(entity?.meta?.[filter.field] !== filter.value);
            break;
          case 'has':
            combineReturns(!!entity?.meta?.[filter.field]);
            break;
          case 'has-not':
            combineReturns(!entity?.meta?.[filter.field]);
            break;
          default:
            break;
        }
        break;
      case 'property':
        let propertyValue = null;
        switch (filter.level ?? 'panel') {
          case 'panel':
          default:
            propertyValue = getPanelProps(panelEntity, entity, filter.field, panelProperties?.[filter.field]);
            break;
        }
        switch (comparison) {
          case 'is':
          case 'equals':
            combineReturns(propertyValue === filter.value);
            break;
          case 'not-is':
          case 'not-equals':
          case 'is-not':
            combineReturns(propertyValue !== filter.value);
            break;
          case 'has':
            combineReturns(!!propertyValue);
            break;
          case 'has-not':
          case 'not-has':
            combineReturns(!propertyValue);
            break;
          default:
            break;
        }
        break;
      case 'entity':
        const filterArray = Array.isArray(filter.value) ? filter.value : [filter.value];
        switch (comparison) {
          case 'is':
          case 'equals':
            combineReturns(filterArray.includes(type));
            break;
          case 'not-is':
          case 'not-equals':
          case 'is-not':
            combineReturns(!filterArray.includes(type));
            break;
          default:
            break;
        }
      case 'window':
        switch (comparison) {
          case 'is':
          case 'equals':
            combineReturns(params.screen === filter.value);
            break;
          case 'not-is':
          case 'not-equals':
          case 'is-not':
            combineReturns(params.screen !== filter.value);
            break;
          default:
            break;
        }
      default:
        break;
    }
  }
  return returnValue;
};

const filterLayers = (layers, type, entity, panelEntity, panelProperties = {}) => layers.map((layer) => {
  if (layer.exclude && layer.exclude.includes(type)) {
    return null;
  }
  if (layer.include && !layer.include.includes(type)) {
    return null;
  }
  if (layer.filter && Array.isArray(layer.filter)) {
    if (!filterByLayer({
      filters: layer.filter,
      entity,
      panelEntity,
      type,
      panelProperties,
      mode: layer.filterMode
    })) {
      return null;
    }
  }
  return layer;
});

export default filterLayers;