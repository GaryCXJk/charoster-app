import params from '../../../helpers/params';
import traverse from '../../../helpers/traverse';
import { getDefaultPanelLayout } from './panel';
import dynamicStyle from './panelstyle/dynamic';
import tiledStyle from './panelstyle/tiled';
import {
  getColorValue,
  handleBackground,
  handleBackgroundImages,
  handleBorders,
  handleBoxed,
  handleColor,
  handleElement,
  handleFont,
  handleSpacing,
  handleStyle
} from './panelstyle/handlers';

const overrideWebkit = {
  webkitBackgroundClip: '-webkit-background-clip',
};

const stylePropTransforms = {
  dynamic: dynamicStyle,
  tiled: tiledStyle,
};

const types = ['characters', 'stages', 'items'];

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
    'preview.background.image',
    'preview.image.background.image',
    'preview.image.characters.background.image',
    'preview.image.stages.background.image',
    'preview.image.mask.image',
  ];
  const types = ['images', 'stages', 'items'];
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

const createStyleString = (styles) => {
  const screen = params.screen;
  const dummy = document.createElement('div');
  const lines = [];

  Object.keys(styles).forEach((selector) => {
    const style = styles[selector];
    Object.assign(dummy.style, style);
    const rules = [dummy.getAttribute('style')];
    Object.keys(overrideWebkit).forEach((prop) => {
      if (dummy.style[prop]) {
        rules.push(`${overrideWebkit[prop]}: ${dummy.style[prop]};`);
      }
    });
    const ruleStr = rules.filter((rule) => rule).join(' ');
    if (ruleStr)  {
      lines.push(`#app.${screen} ${selector} { ${ruleStr} }`);
    }
    dummy.setAttribute('style', '');
  });
  return lines.join('\n');
};

const handleMask = (mask, imageFiles, styleObject = null) => {
  const returnObject = handleBackground(mask, imageFiles, styleObject, {
    size: 'maskSize',
    position: 'maskPosition',
    repeat: 'maskRepeat',
    image: (props, val, imageFiles) => handleBackgroundImages(props, val, imageFiles, 'maskImage'),
  }, 'mask');
  if (!returnObject) {
    return null;
  }
  const webkitStyles = {};
  Object.keys(returnObject).forEach((prop) => {
    const newProp = `webkit${prop.slice(0, 1).toUpperCase()}${prop.slice(1)}`;
    webkitStyles[newProp] = returnObject[prop];
  });
  Object.assign(returnObject, webkitStyles);
  if (styleObject) {
    Object.assign(styleObject, webkitStyles);
  }
  return returnObject;
};

const handleTransform = (style, styleObject = null) => {
  const newStyle = {};

  const transforms = [];

  if (Array.isArray(style)) {
    style.forEach((transform) => {
      if (transform.type) {
        const value = [];
        switch (transform.type) {
          case 'skew':
            value.push(transform.x ?? '0deg');
            if (transform.y) {
              value.push(transform.y);
            }
            transforms.push(`skew(${value.join(',')})`);
            break;
          case 'translate':
            value.push(transform.x ?? '0');
            if (transform.y) {
              value.push(transform.y);
            }
            transforms.push(`translate(${value.join(',')})`);
            break;
          default:
            break;
        }
      }
    });
    if (transforms.length) {
      newStyle.transform = transforms.join(' ');
    }
  }

  if (styleObject) {
    Object.assign(styleObject, newStyle);
  }

  return newStyle;
};

const handleBoxShadow = (style, styleObject = null) => {
  if (typeof style === 'object') {
    const {
      x = 0,
      y = 0,
      blur = 0,
      spread = 0,
      color = 'currentColor',
      inset = false,
    } = style;

    const styleProps = {
      ['box-shadow']: `${inset ? 'inset ' : ''}${x} ${y} ${blur} ${spread} ${getColorValue(color)}`,
    };

    if (styleObject) {
      Object.assign(styleObject, styleProps)
    }

    return styleProps;
  } else if (typeof style === 'string') {
    const styleProps = {
      ['box-shadow']: style,
    };

    if (styleObject) {
      Object.assign(styleObject, styleProps)
    }

    return styleProps;
  }

  return null;
};

const handleContent = (content, imageFiles, styleObject = null) => (
  handleStyle(content, imageFiles, styleObject, {
    direction: (_props, val) => {
      Object.assign(styleObject, {
        display: 'flex',
        flexDirection: val,
      });
    },
    gap: 'gap',
    scroll: (_props, val) => {
      if (val) {
        Object.assign(styleObject, {
          overflow: 'auto',
          scrollbarGutter: 'stable both-edges',
          scrollbarWidth: 'none',
        });
      } else {
        styleObject.overflow = null;
        styleObject.scrollbarGutter = null;
        styleObject.scrollbarWidth = null;
      }
    },
  })
);

const setCSSStyle = (style, imageFiles, styleObject = null) => {
  return handleStyle(style, imageFiles, styleObject, {
    background: (_props, val) => handleBackground(val, imageFiles, styleObject),
    border: (_props, val) => handleBorders(val, imageFiles, styleObject),
    spacing: (_props, val) => handleSpacing(val, imageFiles, styleObject),
    mask: (_props, val) => handleMask(val, imageFiles, styleObject),
    filter: (_props, val) => {
      const ret = processCSSFilters(val);
      if (ret) {
        styleObject.filter = ret;
      }
    },
    boxShadow: (_props, val) => handleBoxShadow(val, styleObject),
    transform: (_props, val) => handleTransform(val, styleObject),
    element: (_props, val) => handleElement(val, styleObject),
    boxed: (_props, val) => handleBoxed(val, styleObject),
    font: (_props, val) => handleFont(val, imageFiles, styleObject),
    content: (_props, val) => handleContent(val, imageFiles, styleObject),
  });
}

/**
 * Process layers, setting their styles.
 * @param {*} layer
 * @param {*} imageFiles
 * @param {*} baseClass
 * @param {*} stateClasses
 * @param {*} styleObject
 */
const processLayer = (layer, imageFiles, baseClass, stateClasses = {}, styleObject = null) => {
  if (layer.style) {
    styleObject[baseClass] = styleObject[baseClass] ?? {};
    setCSSStyle(layer.style, imageFiles, styleObject[baseClass]);
    [...types, ''].forEach((type) => {
      if (!type || layer.style[type]) {
        const typeClass = type ? `.layer-${type}` : '';
        const typeClassName = `${baseClass}${typeClass}`;
        styleObject[typeClassName] = styleObject[typeClassName] ?? {};
        const style = type ? layer.style[type] : layer.style;
        if (type) {
          setCSSStyle(style, imageFiles, styleObject[typeClassName]);
        }
        if (style.font?.link) {
          styleObject[`${typeClassName} a`] = {};
          handleFont(style.font.link, imageFiles, styleObject[`${typeClassName} a`]);
        }
        Object.keys(stateClasses).forEach((state) => {
          if (style[state]) {
            const stateClassName = `${stateClasses[state]}${typeClass}`;
            styleObject[stateClassName] = styleObject[stateClassName] ?? {};
            setCSSStyle(style[state], imageFiles, styleObject[stateClassName]);
            if (style[state].font?.link) {
              styleObject[`${stateClassName} a`] = {};
              handleFont(style[state].font.link, imageFiles, styleObject[`${stateClassName} a`]);
            }
          }
        });
      }
    });
  }
};

export const createStylesheet = ({
  design,
  currentRoster,
  roster,
  imageFiles,
}) => {
  const rosterStyle = getStyleProperties(currentRoster, roster);

  const panelImageFilters = processCSSFilters(design.panels.image?.filters);

  const combinedStyles = {};
  if (design.page?.background) {
    combinedStyles['.sections'] = handleBackground(design.page.background, imageFiles);
  }
  combinedStyles['.content'] = {
    padding: design.panels.margin,
  };
  // If scroll is enabled, allow scrolling but hide the scrollbar.
  // TODO: Implement custom scrollbars using the layer system, allowing the end user to style / theme them.
  if (rosterStyle.panels?.scroll) {
    combinedStyles['.content'].overflow = 'auto';
    combinedStyles['.content'].scrollbarGutter = 'stable both-edges';
    combinedStyles['.content'].scrollbarWidth = 'none';
  }
  if (design.panels.container?.background) {
    handleBackground(design.panels.container.background, imageFiles, combinedStyles['.content']);
  }

  combinedStyles['.panels'] = {
    justifyContent: rosterStyle.alignment.horizontal,
    alignContent: rosterStyle.alignment.vertical,
  };
  combinedStyles['.panels .panel'] = {};
  if (design.panels.background) {
    handleBackground(design.panels.background, imageFiles, combinedStyles['.panels .panel']);
  }
  if (design.panels.boxShadow) {
    handleBoxShadow(design.panels.boxShadow, combinedStyles['.panels .panel']);
  }
  if (design.panels.boxed) {
    handleBoxed(design.panels.boxed, combinedStyles['.panels .panel']);
  }
  combinedStyles['.panel-container'] = {
    width: rosterStyle.panels.width,
    height: rosterStyle.panels.height,
    padding: design.panels.gap,
  };
  combinedStyles['.sections .content .panels .panel'] = {};
  if (design.panels.border) {
    handleBorders(design.panels.border, imageFiles, combinedStyles['.sections .content .panels .panel']);
  }
  if (design.panels.transform) {
    handleTransform(design.panels.transform, combinedStyles['.sections .content .panels .panel']);
  }
  if (design.panels.boxShadow) {
    handleBoxShadow(design.panels.boxShadow, combinedStyles['.sections .content .panels .panel']);
  }
  if (design.panels.element) {
    handleElement(design.panels.element, combinedStyles['.sections .content .panels .panel']);
  }
  if (design.panels.layers ?? getDefaultPanelLayout()) {
    const panelLayers = [{
      panelLayer: design.panels.layers ?? getDefaultPanelLayout(),
      classPrefix: '',
      depth: 0,
    }];
    while (panelLayers.length) {
      const {
        panelLayer,
        classPrefix,
        depth,
      } = panelLayers.shift();
      panelLayer.forEach((layer, elementIdx) => {
        const baseClassName = `.sections .content .panels .panel${classPrefix} .layer.layer-${elementIdx}.layer-depth-${depth}`;
        const activeClassName = `.sections .content .panels .panel.active${classPrefix} .layer.layer-${elementIdx}.layer-depth-${depth}`;
        processLayer(layer, imageFiles, baseClassName, { active: activeClassName }, combinedStyles);
        if (layer.layers) {
          if (layer.type === 'container') {
            panelLayers.push({
              panelLayer: layer.layers,
              classPrefix: `${classPrefix} .layer.layer-${elementIdx}.layer-depth-${depth}`,
              depth: depth + 1,
            });
          }
        }
      });
    }
  }

  const imageFontData = {
    size: '0.6em',
    ...(design.panels.image?.font ?? {})
  };
  const imageFont = handleFont(imageFontData, imageFiles);
  if (imageFontData.autoScale) {
    const { fontMod } = rosterStyle.panels;
    const fontModifier = 1 - (+imageFontData.autoScale * (1 - fontMod));
    imageFont.fontSize = imageFont.fontSize.replace(/^(\d+(?:\.\d+)?)/, (match) => {
      return +match * fontModifier;
    });
  }
  combinedStyles['.sections .content .panels .panel .label'] = imageFont;

  if (panelImageFilters) {
    combinedStyles['.panels .panel .image'] = {
      filter: panelImageFilters,
    };
  }
  if (design.panels.active) {
    const activeStyle = {};
    Object.assign(activeStyle, design.panels.active);
    combinedStyles[`.panels .panel.active`] = activeStyle;
    setCSSStyle(design.panels.active, imageFiles, combinedStyles[`.panels .panel.active`]);
  }
  if (design.panels.classNames) {
    Object.keys(design.panels.classNames).forEach((className) => {
      const classStyle = {};
      const defStyle = design.panels.classNames[className];
      Object.keys(defStyle).forEach((defProp) => {
        const defVal = defStyle[defProp];
        switch (defProp) {
          case 'background':
            handleBackground(defVal, imageFiles, classStyle);
            break;
          case 'maskImage': {
            const tempProps = handleBackgroundImages({}, defVal, imageFiles);
            if (tempProps) {
              classStyle.maskImage = tempProps.backgroundImage;
            }
            break;
          }
          case 'border':
            handleBorders(defVal, imageFiles, classStyle);
            break;
          default:
            classStyle[defProp] = defVal;
            break;
        }
      });
      combinedStyles[`.panels .panel .${className}`] = design.panels.classNames[className];
    });
  }
  if (design.preview.background) {
    combinedStyles['.sections .preview'] = handleBackground(design.preview.background, imageFiles);
  }
  if (design.preview.style) {
    setCSSStyle(design.preview.style, imageFiles, combinedStyles['.sections .preview']);
  }

  const imagePreviews = ['', ...types];

  imagePreviews.forEach((type) => {
    const selector = `.sections .preview .image-container${type ? `.image-container-${type}` : ''}`;
    let designStyle = design.preview.image;
    let labelStyle = design.preview.label ?? {};
    if (type) {
      designStyle = designStyle[type] ?? {};
      labelStyle = labelStyle[type] ?? {};
    }
    combinedStyles[selector] = {};
    if (designStyle.width) {
      combinedStyles[selector].width = designStyle.width;
    }
    if (designStyle.height) {
      combinedStyles[selector].height = designStyle.height;
    }
    if (designStyle.background) {
      handleBackground(designStyle.background, imageFiles, combinedStyles[selector]);
    }
    if (designStyle.border) {
      handleBorders(designStyle.border, imageFiles, combinedStyles[selector]);
    }
    combinedStyles[`${selector} .image`] = {};
    if (designStyle.mask) {
      handleMask(designStyle.mask, imageFiles, combinedStyles[`${selector} .image`]);
    }
    const previewImageFilters = processCSSFilters(designStyle.filters);
    if (previewImageFilters) {
      combinedStyles[`${selector} .image`].filter = previewImageFilters;
    }

    combinedStyles[`${selector} .label`] = {};
    const previewLabelFilters = processCSSFilters(labelStyle.filters ?? []);
    if (previewLabelFilters) {
      combinedStyles[`${selector} .label`].filter = previewLabelFilters;
    }
  });

  if (design.preview.layout) {
    const previewLayouts = [{
      previewLayout: design.preview.layout,
      classPrefix: '',
      depth: 0,
    }];
    while (previewLayouts.length) {
      const {
        previewLayout,
        classPrefix,
        depth,
      } = previewLayouts.shift();
      previewLayout.forEach((layout, elementIdx) => {
        const baseClassName = `.sections .preview${classPrefix} .element.element-${elementIdx}.element-depth-${depth}`;
        processLayer(layout, imageFiles, baseClassName, {}, combinedStyles);
        if (layout.layers) {
          if (layout.type === 'container') {
            previewLayouts.push({
              previewLayout: layout.layers,
              classPrefix: `${classPrefix} .element.element-${elementIdx}.element-depth-${depth}`,
              depth: depth + 1,
            });
          } else {
            const previewLayers = [{
              previewLayer: layout.layers,
              layerClassPrefix: '',
              layerDepth: 0,
            }];
            while (previewLayers.length) {
              const {
                previewLayer,
                layerClassPrefix,
                layerDepth,
              } = previewLayers.shift();
              previewLayer.forEach((layer, layerIdx) => {
                const className = `${baseClassName}${layerClassPrefix} .layer.layer-${layerIdx}.layer-depth-${layerDepth}`;
                processLayer(layer, imageFiles, className, {}, combinedStyles);
                if (layer.layers) {
                  previewLayers.push({
                    previewLayer: layer.layers,
                    layerClassPrefix: `${layerClassPrefix} .layer.layer-${layerIdx}.layer-depth-${layerDepth}`,
                    layerDepth: layerDepth + 1,
                  });
                }
              });
            }
          }
        }
      });
    }
  }

  return createStyleString(combinedStyles);
};
