import params from "../../helpers/params";
import getPanelProps from "./getPanelProps";

const filterByLayer = (filters, entity, panelEntity, type, panelProperties = {}, mode = 'and') => {
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
        combineReturns(filterByLayer(filter.filters ?? [], entity, panelEntity, type, panelProperties, filter.type));
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
        const panelPropertyValue = getPanelProps(panelEntity, entity, filter.field, panelProperties?.[filter.field]);
        console.log(panelEntity, panelPropertyValue);
        switch (comparison) {
          case 'is':
          case 'equals':
            combineReturns(panelPropertyValue === filter.value);
            break;
          case 'not-is':
          case 'not-equals':
          case 'is-not':
            combineReturns(panelPropertyValue !== filter.value);
            break;
          case 'has':
            combineReturns(!!panelPropertyValue);
            break;
          case 'has-not':
          case 'not-has':
            combineReturns(!panelPropertyValue);
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
    if (!filterByLayer(layer.filter, entity, panelEntity, type, panelProperties, layer.filterMode)) {
      return null;
    }
  }
  return layer;
});

export default filterLayers;