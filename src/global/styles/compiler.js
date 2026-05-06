import deepmerge from "deepmerge";
import traverse from "../../helpers/traverse";
import dynamicStyle from "./panelStyles/dynamic";
import tiledStyle from "./panelStyles/tiled";
import { getDefaultPanelLayout } from "./layouts/panels";

const stylePropTransforms = {
  dynamic: dynamicStyle,
  tiled: tiledStyle,
};

const types = ['characters', 'stages', 'items', 'media', 'other'];

const checkFileImages = (found, queue) => {
  if (found) {
    if (Array.isArray(found)) {
      found.forEach((foundItem) => {
        checkFileImages(foundItem, queue);
      });
    } else if (typeof found === 'object' && ['file', 'url'].includes(found.type) && found.file && typeof found.file === 'string') {
      queue.push(found.file);
    } else if (typeof found === 'string') {
      queue.push(found);
    }
  }
}

const queueLayerImages = (queue, types, layer) => {
  if (layer.style) {
    if (layer.style.background?.image) {
      checkFileImages(layer.style.background?.image, queue);
    }
    if (layer.style.mask?.image) {
      checkFileImages(layer.style.mask?.image, queue);
    }
    types.forEach((type) => {
      if (layer.style[type]) {
        if (layer.style[type].background?.image) {
          checkFileImages(layer.style[type].background.image, queue);
        }
        if (layer.style[type].mask?.image) {
          checkFileImages(layer.style[type].mask.image, queue);
        }
      }
    });
  };
}

export const createDesignQueue = (design) => {
  const queue = [];
  const checks = [
    'page.background.image',
    'panels.background.image',
    'panels.active.background.image',
    'panels.container.background.image',
    'panels.style.background.image',
    'panels.style.backdrop.background.image',
    'panels.style.empty.background.image',
    'preview.background.image',
    'preview.image.background.image',
    'preview.image.characters.background.image',
    'preview.image.stages.background.image',
    'preview.image.mask.image',
  ];
  const types = ['images', 'stages', 'items', 'media', 'other'];
  checks.forEach((check) => {
    const found = traverse(check.split('.'), design);
    checkFileImages(found, queue);
  });
  if (design.panels.classNames) {
    Object.keys(design.panels.classNames).forEach((className) => {
      const style = design.panels.classNames[className];
      if (style.background?.image) {
        checkFileImages(style.background.image, queue);
      }
      if (style.mask?.image) {
        checkFileImages(style.mask.image, queue);
      }
      if (style.maskImage) {
        checkFileImages(style.maskImage, queue);
      }
      types.forEach((type) => {
        if (style[type]) {
          if (style[type].background?.image) {
            checkFileImages(style[type].background.image, queue);
          }
          if (style[type].mask?.image) {
            checkFileImages(style[type].mask.image, queue);
          }
          if (style[type].maskImage) {
            checkFileImages(style[type].maskImage, queue);
          }
        }
      });
    });
  }
  const locations = [];
  locations.push(design.panels.layers ?? getDefaultPanelLayout());
  if (design.preview?.layout) {
    const previewLayouts = [design.preview.layout];
    while (previewLayouts.length) {
      const previewLayout = previewLayouts.shift();
      previewLayout.forEach((layout) => {
        queueLayerImages(queue, types, layout);
        if (layout.layers) {
          if (layout.type === 'container') {
            previewLayouts.push(layout.layers);
          } else {
            locations.push(layout.layers);
          }
        }
      });
    }
  }
  if (locations.length) {
    locations.forEach((location) => {
      location.forEach(queueLayerImages.bind(null, queue, types));
    });
  }
  return queue;
}

const getStyleProperties = (currentRoster, roster) => {
  const returnStyle = {};

  returnStyle.alignment = {
    horizontal: 'center',
    vertical: 'center',
    ...(currentRoster.alignment ?? {})
  };

  if (returnStyle.alignment.horizontal === 'left') {
    returnStyle.alignment.horizontal = 'start';
  }
  if (returnStyle.alignment.horizontal === 'right') {
    returnStyle.alignment.horizontal = 'end';
  }

  if (returnStyle.alignment.vertical === 'top') {
    returnStyle.alignment.vertical = 'start';
  }
  if (returnStyle.alignment.vertical === 'bottom') {
    returnStyle.alignment.vertical = 'end';
  }

  if (stylePropTransforms[currentRoster.mode]) {
    stylePropTransforms[currentRoster.mode](currentRoster, roster, returnStyle)
  }

  return returnStyle;
};

const processCSSFilters = (filters) => {
  if (!filters) {
    return null;
  }
  if (filters === 'none') {
    return filters;
  }
  const processedFilters = [];

  filters.forEach((filter) => {
    const { type, value } = filter;
    let processedValue = [];
    switch (type) {
      case 'blur':
        processedValue.push(value.radius);
        break;
      case 'drop-shadow':
        processedValue.push(value.x, value.y);
        if (value.radius) {
          processedValue.push(value.radius);
        }
        if (getColorValue(value.color)) {
          processedValue.push(getColorValue(value.color));
        }
        break;
      default:
        break;
    }
    processedFilters.push(`${type}(${processedValue.join(' ')})`);
  });
  return processedFilters.join(' ');
};

const styleToString = (style) => {
    return Object.keys(style).reduce((acc, key) => {
        if (style[key] === null || style[key] === undefined) {
          return acc;
        }
        let cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        if (cssKey.startsWith('webkit')) {
          cssKey = `-${cssKey}`;
        }
        return `${acc}${cssKey}: ${style[key]}; `;
      }, '');
};

export const createStyleString = (styles, screen) => {
  const lines = [];

  Object.keys(styles).forEach((selector) => {
    const style = deepmerge({}, styles[selector]);
    const ruleStr = styleToString(style);
    if (ruleStr)  {
      lines.push(`#app.${screen} ${selector} { ${ruleStr} }`);
    }
  });
  return lines.join('\n');
};
