import { handleColor } from "./color";

export const handleRadiuses = (radius, _imageFiles, styleObject = null, prefix = 'radius') => {
  const styleProps = {};
  switch (prefix) {
    case 'top-radius':
    case 'bottom-radius': {
      const side = prefix.slice(0, -7);
      styleProps[`border-${side}-left-radius`] = radius;
      styleProps[`border-${side}-right-radius`] = radius;
      break;
    }
    case 'left-radius':
    case 'right-radius': {
      const side = prefix.slice(0, -7);
      styleProps[`border-top-${side}-radius`] = radius;
      styleProps[`border-bottom-${side}-radius`] = radius;
      break;
    }
    default:
      styleProps[`border-${prefix}`] = radius;
      break;
  }

  if (styleObject) {
    Object.assign(styleObject, styleProps)
  }

  return styleProps;
}

export const handleBorders = (border, imageFiles, styleObject = null, prefix = null) => {
  const bMap = {
    width: 'width',
    style: 'style',
    color: (val, _imageFiles, props, prop) => handleColor(props, val, prop),
    radius: handleRadiuses,
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
          mapTo(val, imageFiles, styleProps, `${prefix ? `${prefix}-` : ''}${prop}`);
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
