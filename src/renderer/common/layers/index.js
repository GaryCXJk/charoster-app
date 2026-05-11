import dummy from './dummy';
import container from './container';
import image, { imageModifier } from './image';
import label, { labelModifier } from './label';

export const baseModifiers = {
    image: imageModifier,
    label: labelModifier,
};

export const panelModifiers = {
    ...baseModifiers,
};

export const previewModifiers = {
    ...baseModifiers,
};

export const baseLayers = {
    dummy,
    container,
    image,
    label,
};

export const panelLayers = {
    ...baseLayers,
};

export const previewLayers = {
    ...baseLayers,
};
