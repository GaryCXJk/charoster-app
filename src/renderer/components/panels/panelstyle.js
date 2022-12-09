import params from '../../../helpers/params';
import traverse from '../../../helpers/traverse';
import { getDefaultPanelLayout } from './panel';
import dynamicStyle from './panelstyle/dynamic';

const overrideWebkit = {
  webkitBackgroundClip: '-webkit-background-clip',
};

const stylePropTransforms = {
  dynamic: dynamicStyle,
};

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
      case 'drop-shadow':
        processedValue.push(value.x, value.y);
        if (value.radius) {
          processedValue.push(value.radius);
        }
        if (value.color) {
          processedValue.push(value.color);
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

const handleBackgroundImages = (props, val, imageFiles, prop = 'backgroundImage') => {
  if (Array.isArray(val)) {
    const bgImages = [];

    val.forEach((item) => {
      const tempProps = {};
      handleBackgroundImages(tempProps, item, imageFiles, prop);
      if (tempProps[prop]) {
        bgImages.push(tempProps[prop]);
      }
    });

    props[prop] = bgImages.join(', ');
    return props;
  }
  if (typeof val === 'object') {
    switch (val.type) {
      case 'file':
      case 'url':
        if (!val.file || !imageFiles[val.file]) {
          return null;
        }
        const fileInfo = imageFiles[val.file].raw;
        props[prop] = `url(${fileInfo.file ?? fileInfo.data})`;
        break;
      case 'gradient':
        const validGradients = ['linear-gradient', 'repeating-linear-gradient', 'radial-gradient', 'repeating-radial-gradient', 'conic-gradient'];
        if (!val.gradientType || !validGradients.includes(val.gradientType) || !val.value) {
          return null;
        }
        props[prop] = `${val.gradientType}(${val.value})`;
        break;
      default:
        return null;
    }
    return props;
  } else if (typeof val === 'string' && val && imageFiles[val]) {
    const fileInfo = imageFiles[val];
    props[prop] = `url(${fileInfo.file ?? fileInfo.data})`;
    return props;
  }
  return null;
};

const handleStyle = (style, imageFiles, styleObject = null, styleMap = {}) => {
  if (typeof style !== 'object') {
    return null;
  }
  const styleProps = {};

  Object.keys(styleMap).forEach((prop) => {
    const mapTo = styleMap[prop];
    const val = style[prop];
    if (typeof val !== 'undefined') {
      if (typeof mapTo === 'function') {
        mapTo(styleProps, val, imageFiles);
      } else {
        styleProps[mapTo] = val;
      }
    }
  });

  if (styleObject) {
    Object.assign(styleObject, styleProps);
  }

  return styleProps;
}

const handleBackground = (background, imageFiles, styleObject = null, bgMap = {
  color: 'backgroundColor',
  size: 'backgroundSize',
  position: 'backgroundPosition',
  repeat: 'backgroundRepeat',
  image: handleBackgroundImages,
  clip: (props, val) => {
    Object.assign(props, {
      webkitBackgroundClip: val,
      backgroundClip: val,
    });
  },
}, backgroundKey = 'background') => {

  if (typeof background === 'object') {
    return handleStyle(background, imageFiles, styleObject, bgMap);
  } else if (typeof background === 'string') {
    const styleProps = {
      [backgroundKey]: background,
    };

    if (styleObject) {
      Object.assign(styleObject, styleProps);
    }

    return styleProps;
  }
  return null;
}

const handleBorders = (border, imageFiles, styleObject = null, prefix = null) => {
  const bMap = {
    width: 'width',
    style: 'style',
    color: 'color',
    left: handleBorders,
    right: handleBorders,
    top: handleBorders,
    bottom: handleBorders,
  };

  if (typeof border === 'object') {
    const styleProps = {};

    Object.keys(bMap).forEach((prop) => {
      const mapTo = bMap[prop];
      const val = border[prop];
      if (val) {
        if (typeof mapTo === 'function') {
          mapTo(val, imageFiles, styleProps, prop);
        } else {
          styleProps[`border-${prefix ? `${prefix}-` : ''}${mapTo}`] = val;
        }
      }
    });

    if (styleObject) {
      Object.assign(styleObject, styleProps);
    }

    return styleProps;
  } else if (typeof border === 'string') {
    const styleProps = {
      [`border${prefix ? `-${prefix}` : ''}`]: border,
    };

    if (styleObject) {
      Object.assign(styleObject, styleProps)
    }

    return styleProps;
  }
  return null;
}

const handleSpacing = (spacing, imageFiles, styleObject = null, prefix = null) => {
  const allowedDirections = ['left', 'right', 'top', 'bottom'];
  const allowedSpacing = ['padding', 'margin'];

  if (prefix && !allowedSpacing.includes(prefix)) {
    return null;
  }

  if (typeof spacing === 'object') {
    const styleProps = {};

    if (prefix) {
      allowedDirections.forEach((direction) => {
        const val = spacing[direction];
        if (val && typeof val === 'string') {
          styleProps[`${prefix}-${direction}`] = val;
        }
      });
    } else {
      allowedSpacing.forEach((spacingProp) => {
        const val = spacing[spacingProp];
        if (val) {
          if (typeof val === 'object') {
            const newProps = handleSpacing(val, imageFiles, null, spacingProp);
            if (newProps) {
              Object.assign(styleProps, newProps);
            }
          } else if (typeof val === 'string') {
            styleProps[spacingProp] = val;
          }
        }
      });
    }
    if (styleObject) {
      Object.assign(styleObject, styleProps);
    }

    return styleProps;
  } else if (typeof spacing === 'string') {
    if (!prefix) {
      return null;
    }
    const styleProps = {
      [prefix]: spacing,
    };

    if (styleObject) {
      Object.assign(styleObject, styleProps)
    }

    return styleProps;
  }
}

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

const handleFont = (font, imageFiles, styleObject = null) => (
  handleStyle(font, imageFiles, styleObject, {
    size: 'fontSize',
    family: 'fontFamily',
    weight: 'fontWeight',
    style: 'fontStyle',
    decoration: 'textDecoration',
    color: 'color',
    alignment: 'textAlign',
    stroke: (props, val) => {
      if (typeof val === 'object') {
        handleStyle({
          order: 'stroke',
          ...val
        }, imageFiles, props, {
          width: 'webkitTextStrokeWidth',
          color: 'webkitTextStrokeColor',
          order: 'paintOrder',
        });
      } else if (typeof val === 'string') {
        props['webkitTextStroke'] = val;
        props['paintOrder'] = 'stroke';
      }
      if (font.color) {
        props['webkitTextFillColor'] = font.color;
      }
    }
  })
);

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

const handleElement = (style, styleObject = null) => {
  const {
    width = null,
    height = null,
    left = null,
    right = null,
    top = null,
    bottom = null,
    overlay = false,
    contain = false
  } = style;

  const newStyle = {};

  if (width !== null || height !== null) {
    newStyle.width = width;
    newStyle.height = height;
    newStyle.left = 'auto';
    newStyle.right = 'auto';
    newStyle.top = 'auto';
    newStyle.bottom = 'auto';
  }
  if (left !== null || right !== null) {
    newStyle.left = left ?? newStyle.left ?? 'auto';
    newStyle.right = right ?? newStyle.right ?? 'auto';
  }
  if (top !== null || bottom !== null) {
    newStyle.top = top ?? newStyle.top ?? 'auto';
    newStyle.bottom = bottom ?? newStyle.bottom ?? 'auto';
  }
  if (overlay) {
    newStyle.position = 'absolute';
  }
  if (contain) {
    newStyle.overflow = 'hidden';
  }

  if (styleObject) {
    Object.assign(styleObject, newStyle);
  }

  return newStyle;
}

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
      ['box-shadow']: `${inset ? 'inset ' : ''}${x} ${y} ${blur} ${spread} ${color}`,
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
    boxed: (_props, val) => {
      if (!val) {
        styleObject['clip-path'] = 'none';
      }
    },
    font: (_props, val) => handleFont(val, imageFiles, styleObject),
    content: (_props, val) => handleContent(val, imageFiles, styleObject),
  });
}

export const createStylesheet = ({
  design,
  currentRoster,
  roster,
  imageFiles,
}) => {
  const rosterStyle = getStyleProperties(currentRoster, roster);
  const types = ['characters', 'stages', 'items'];

  const panelImageFilters = processCSSFilters(design.panels.image?.filters);

  const combinedStyles = {};
  if (design.page?.background) {
    combinedStyles['.sections'] = handleBackground(design.page.background, imageFiles);
  }
  combinedStyles['.content'] = {
    padding: design.panels.margin,
  };
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
  (design.panels.layers ?? getDefaultPanelLayout()).forEach((layer, idx) => {
    if (layer.style) {
      const className = `.sections .content .panels .panel .layer.layer-${idx}`;
      combinedStyles[className] = combinedStyles[className] ?? {};
      setCSSStyle(layer.style, imageFiles, combinedStyles[className]);
      types.forEach((type) => {
        if (layer.style[type]) {
          const typeClassName = `${className}.layer-${type}`;
          combinedStyles[typeClassName] = combinedStyles[typeClassName] ?? {};
          setCSSStyle(layer.style[type], imageFiles, combinedStyles[typeClassName]);
        }
      });
      if (layer.style.font?.link) {
        combinedStyles[`${className} a`] = [];
        handleFont(layer.style.font.link, imageFiles, combinedStyles[`${className} a`]);
      }
    }
  });

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
        if (layout.style) {
          combinedStyles[baseClassName] = combinedStyles[baseClassName] ?? {};
          setCSSStyle(layout.style, imageFiles, combinedStyles[baseClassName]);
          if (layout.style.font?.link) {
            combinedStyles[`${baseClassName} a`] = [];
            handleFont(layout.style.font.link, imageFiles, combinedStyles[`${baseClassName} a`]);
          }
        }
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
                if (layer.style) {
                  const className = `${baseClassName}${layerClassPrefix} .layer.layer-${layerIdx}.layer-depth-${layerDepth}`;
                  combinedStyles[className] = combinedStyles[className] ?? {};
                  setCSSStyle(layer.style, imageFiles, combinedStyles[className]);
                  types.forEach((type) => {
                    if (layer.style[type]) {
                      const subClassName = `${className}.layer-${type}`;
                      combinedStyles[subClassName] = combinedStyles[subClassName] ?? {};
                      setCSSStyle(layer.style[type], imageFiles, combinedStyles[subClassName]);
                    }
                  });
                  if (layer.style.font?.link) {
                    combinedStyles[`${className} a`] = [];
                    handleFont(layer.style.font.link, imageFiles, combinedStyles[`${className} a`]);
                  }
                }
                if (layer.layers) {
                  previewLayers.push({
                    previewLayer: layer.layers,
                    layerClassPrefix: `${layerClassPrefix} .layer.layer-${layerIdx}.layer-depth-${layerDepth}`,
                    layerDepth: layerDepth + 1,
                  });
                }
              });
            }
            /*
            layout.layers.forEach((layer, layerIdx) => {
              if (layer.style) {
                const className = `${baseClassName} .layer.layer-${layerIdx}`;
                combinedStyles[className] = combinedStyles[className] ?? {};
                setCSSStyle(layer.style, imageFiles, combinedStyles[className]);
                types.forEach((type) => {
                  if (layer.style[type]) {
                    const subClassName = `${className}.layer-${type}`;
                    combinedStyles[subClassName] = combinedStyles[subClassName] ?? {};
                    setCSSStyle(layer.style[type], imageFiles, combinedStyles[subClassName]);
                  }
                });
              }
            });
            */
          }
        }
      });
    }
  }

  return createStyleString(combinedStyles);
};
