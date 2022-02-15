import params from '../../../helpers/params';
import traverse from '../../../helpers/traverse';
import dynamicStyle from './panelstyle/dynamic';

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

export const createDesignQueue = (design) => {
  const queue = [];
  const checks = [
    'background.image',
    'panels.background.image',
    'panels.container.background.image',
    'preview.background.image',
    'preview.image.background.image',
    'preview.image.mask.image',
  ];
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
      if (style.maskImage) {
        checkFileImages(style.maskImage, queue);
      }
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

  if (returnStyle.alignment.vertical === 'top') {
    returnStyle.alignment.vertical = 'start';
  }

  if (stylePropTransforms[currentRoster.mode]) {
    stylePropTransforms[currentRoster.mode](currentRoster, roster, returnStyle)
  }

  return returnStyle;
};

const processCSSFilters = (filters) => {
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
    const rules = dummy.getAttribute('style');
    if (rules)  {
      lines.push(`#app.${screen} ${selector} { ${rules} }`);
    }
    dummy.setAttribute('style', '');
  });
  console.log(lines);
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
        props[prop] = `url(${imageFiles[val.file].raw.data})`;
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
    props[prop] = `url(${imageFiles[val].raw.data})`;
    return props;
  }
  return null;
};

const handleBackground = (background, imageFiles, styleObject = null, bgMap = {
  color: 'backgroundColor',
  size: 'backgroundSize',
  position: 'backgroundPosition',
  repeat: 'backgroundRepeat',
  image: handleBackgroundImages,
}) => {

  if (typeof background === 'object') {
    const styleProps = {};

    Object.keys(bgMap).forEach((prop) => {
      const mapTo = bgMap[prop];
      const val = background[prop];
      if (val) {
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
  } else if (typeof background === 'string') {
    const styleProps = {
      background,
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
          mapTo(styleProps, val, imageFiles, prop);
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

const handleMask = (mask, imageFiles, styleObject = null) => {
  const background = handleBackground(mask, imageFiles, styleObject, {
    size: 'maskSize',
    position: 'maskPosition',
    repeat: 'maskRepeat',
    image: (props, val, imageFiles) => handleBackgroundImages(props, val, imageFiles, 'maskImage'),
  });
  if (!background) {
    return null;
  }
  const webkitStyles = {};
  Object.keys(background).forEach((prop) => {
    const newProp = `webkit${prop.slice(0, 1).toUpperCase()}${prop.slice(1)}`;
    webkitStyles[newProp] = background[prop];
  });
  Object.assign(background, webkitStyles);
  if (styleObject) {
    Object.assign(styleObject, webkitStyles);
  }
  return background;
};

export const createStylesheet = ({
  design,
  currentRoster,
  roster,
  imageFiles,
}) => {
  const rosterStyle = getStyleProperties(currentRoster, roster);

  const panelImageFilters = processCSSFilters(design.panels.image.filters);
  const previewImageFilters = processCSSFilters(design.preview.image.filters);

  const combinedStyles = {};
  if (design.background) {
    combinedStyles['.sections'] = handleBackground(design.background, imageFiles);
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
  if (panelImageFilters) {
    combinedStyles['.panels .panel .image'] = {
      filter: panelImageFilters,
    };
  }
  if (design.panels.active) {
    combinedStyles[`.panels .panel.active`] = design.panels.active;
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
  combinedStyles['.sections .preview .image-container'] = {};
  if (design.preview.image.width) {
    combinedStyles['.sections .preview .image-container'].width = design.preview.image.width;
  }
  if (design.preview.image.height) {
    combinedStyles['.sections .preview .image-container'].width = design.preview.image.height;
  }
  if (design.preview.image.background) {
    handleBackground(design.preview.image.background, imageFiles, combinedStyles['.sections .preview .image-container']);
  }
  if (design.preview.image.border) {
    handleBorders(design.preview.image.border, imageFiles, combinedStyles['.sections .preview .image-container']);
  }
  combinedStyles['.preview .image'] = {};
  if (design.preview.image.mask) {
    handleMask(design.preview.image.mask, imageFiles, combinedStyles['.preview .image']);
  }
  /*
  if (design.preview.image.maskImage) {
    handleMaskImage(design.preview.image.maskImage, imageFiles, combinedStyles['.preview .image']);
  }*/
  if (previewImageFilters) {
    combinedStyles['.preview .image'].filter = previewImageFilters;
  }
  console.log(combinedStyles);

  return createStyleString(combinedStyles);
};
