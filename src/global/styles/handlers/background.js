import { handleColor } from "./color";
import { handleStyle } from "./style";

export const handleBackgroundSize = (props, val) => {
  if (typeof val === 'object') {
    const { width, height } = val;
    props.backgroundSize = `${width} ${height}`;
  } else if (typeof val === 'string') {
    props.backgroundSize = val;
  }

  return props;
};

export const handleBackgroundPosition = (props, val) => {
  if (typeof val === 'object') {
    const { x, y } = val;
    props.backgroundPosition = `${x} ${y}`;
  } else if (typeof val === 'string') {
    props.backgroundPosition = val;
  }

  return props;
};

export const handleBackgroundGradient = (props, val, imageFiles) => {
  // TODO: implementation for gradient background
};

export const handleBackgroundImages = (props, val, imageFiles, prop = 'backgroundImage') => {
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

export const handleBackground = (background, imageFiles, styleObject = null, bgMap = {
  color: (props, val) => handleColor(props, val, 'backgroundColor'),
  size: handleBackgroundSize,
  position: handleBackgroundPosition,
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
