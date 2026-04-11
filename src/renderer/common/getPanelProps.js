import { getEntity } from "../components/panels/processing/entities";

export const extractDefaultValue = (propData, entityInfo) => {
    const defaultValue = propData?.default;
    if (typeof defaultValue === 'object') {
        if (defaultValue.meta) {
            if (typeof defaultValue.meta === 'object') {
                const {
                    field,
                    operation = 'has',
                } = defaultValue.meta;
                const metaValue = entityInfo?.meta?.[field] ?? null;
                switch (operation) {
                    case 'has':
                        return !!metaValue;
                    default:
                        break;
                }
            } else {
                return entityInfo?.meta?.[defaultValue.meta] ?? null;
            }
        }

        return null;
    }
    return defaultValue;
}

const getPanelProps = (entity, entityInfo, property, propData = null) => {
    if (entity.properties?.[property] !== null && entity.properties?.[property] !== undefined) {
        return entity.properties[property];
    }
    return extractDefaultValue(propData, entityInfo);
}

export default getPanelProps;