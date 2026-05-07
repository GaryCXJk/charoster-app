import { getColorValue, handleColor } from "./color";
import { getPositionString } from "./spacing";
import { handleStyle } from "./style";

const processImageUrl = (url) => {
  let processedUrl = url.trim();
  // Strip the url() wrapper if it's already present
  if (/^url\((.*)\)$/.test(processedUrl)) {
    processedUrl = processedUrl.match(/^url\((.*)\)$/)[1].trim();
  }
  // Trim any spaces left after stripping url()
  processedUrl = processedUrl.trim();
  // Strip quotes if present
  if ((processedUrl.startsWith('"') && processedUrl.endsWith('"')) || (processedUrl.startsWith("'") && processedUrl.endsWith("'"))) {
    processedUrl = processedUrl.slice(1, -1);
  }
  // Trim any spaces again after stripping quotes
  processedUrl = processedUrl.trim();
  // (Re-)add quotes and (re-)wrap in url()
  return `url("${processedUrl}")`;
};

export const handleBackgroundSize = (props, val, prop = 'backgroundSize') => {
  if (typeof val === 'object') {
    const { width, height } = val;
    props[prop] = `${width} ${height}`;
  } else if (typeof val === 'string') {
    props[prop] = val;
  }

  return props;
};

export const handleBackgroundPosition = (props, val, prop = 'backgroundPosition') => {
  if (typeof val === 'object') {
    const { x, y } = val;
    props[prop] = `${x} ${y}`;
  } else if (typeof val === 'string') {
    props[prop] = val;
  }

  return props;
};

export const handleBackgroundRepeat = (props, val, prop = 'backgroundRepeat', validValues = ['repeat', 'no-repeat', 'round', 'space'], fallback = 'repeat') => {
  if (typeof val === 'object') {
    let { x, y } = val;
    ['x', 'y'].forEach((axis) => {
      if (val[axis] && !validValues.includes(val[axis])) {
        if (fallback) {
          val[axis] = fallback;
        }
      } else if (!val[axis]) {
        val[axis] = val.x ??fallback;
      }
    });
    props[prop] = `${x} ${y}`;
  } else if (typeof val === 'string') {
    props[prop] = val;
  }

  return props;
};

export const handleBackgroundGradient = (props, val, imageFiles, prop = 'backgroundImage') => {
  const validGradients = ['linear', 'radial'];
  const gradientRemap = {
    'linear-gradient': 'linear',
    'radial-gradient': 'radial',
  }
  let gradientType = validGradients.includes(val.gradientType) ? val.gradientType : (gradientRemap[val.gradientType] ?? null);
  if (!gradientType) {
    return props;
  }
  // This is a legacy feature and should no longer be used, as it won't be supported in languages that don't support CSS-like gradients, but we'll keep it for now for backward compatibility with older styles
  if (val.value) {
    props[prop] = `${gradientType}-gradient(${val.value})`;
    return props;
  }
  const values = [];
  let direction = val.direction ?? null;
  if (direction) {
    // Direction has to be validated first
    const validDirections = ['to top', 'to bottom', 'to left', 'to right', 'to top left', 'to top right', 'to bottom left', 'to bottom right'];
    if (validDirections.includes(direction)) {
      values.push(direction);
    } else if (gradientType === 'linear') {
      // Linear gradients can also have an angle as direction
      const angleMatch = direction.match(/^(-?\d+)(deg|rad|turn)$/);
      if (angleMatch) {
        values.push(direction);
      }
    } else if (gradientType === 'radial') {
      // Radial gradients can have shape and size as direction
      const shapeSizeMatch = direction.match(/^(circle|ellipse)?\s*(closest-side|closest-corner|farthest-side|farthest-corner)?$/);
      if (shapeSizeMatch) {
        const shape = shapeSizeMatch[1] ?? '';
        const size = shapeSizeMatch[2] ?? '';
        values.push(`${shape} ${size}`.trim());
      }
    }
    // Otherwise we'll ignore this value, to simplify validation and avoid invalid CSS as well as limit scope for reimplmentations in other languages
  }
  if (Array.isArray(val.stops)) {
    val.stops.forEach((stop) => {
      if (stop.color) {
        const colorValue = getColorValue(stop.color);
        const positionValue = stop.position ? ` ${stop.position}` : '';
        if (colorValue) {
          values.push(`${colorValue}${positionValue}`);
        }
      }
    });
  }
  if (values.length > 0) {
    props[prop] = `${gradientType}-gradient(${values.join(', ')})`;
  }
  return props;
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
      case 'url': {
        if (!val.file || !imageFiles[val.file]) {
          return null;
        }
        const fileInfo = imageFiles[val.file].raw;
        const fileUrl = fileInfo.file ?? fileInfo.data;
        props[prop] = processImageUrl(fileUrl);
        break;
      }
      case 'gradient': {
        const validGradients = ['linear-gradient', 'repeating-linear-gradient', 'radial-gradient', 'repeating-radial-gradient', 'conic-gradient'];
        if (!val.gradientType || !validGradients.includes(val.gradientType) || !val.value) {
          return null;
        }
        props[prop] = `${val.gradientType}(${val.value})`;
        break;
      }
      case '9slice':
      case '9-slice': {
        // Only run this if the prop is backgroundImage, as it should only apply to this.
        if (prop !== 'backgroundImage') {
          return null;
        }
        if (!val.file || !imageFiles[val.file]) {
          return null;
        }
        const fileInfo = imageFiles[val.file].raw;
        const fileUrl = fileInfo.file ?? fileInfo.data;

        delete props.backgroundSize;
        delete props.backgroundRepeat;
        delete props.backgroundPosition;
        
        props.borderImageSource = processImageUrl(fileUrl);
        const sliceString = getPositionString(val.slice);
        if (sliceString) {
          props.borderImageSlice = `${sliceString} fill`;
        }
        if (val.repeat) {
          handleBackgroundRepeat(props, val.repeat, 'borderImageRepeat', ['stretch', 'repeat', 'round', 'space'], 'stretch');
        }
        if (val.width) {
          const widthString = getPositionString(val.width);
          if (widthString) {
            props.borderImageWidth = widthString;
          }
        }
        if (val.outset) {
          const outsetString = getPositionString(val.outset);
          if (outsetString) {
            props.borderImageOutset = outsetString;
          }
        }
        break;
      }
      default:
        return null;
    }
    return props;
  } else if (typeof val === 'string' && val && imageFiles[val]) {
    const fileInfo = imageFiles[val];
    const fileUrl = fileInfo.file ?? fileInfo.data;
    props[prop] = processImageUrl(fileUrl);
    return props;
  }
  return null;
};

export const handleBackground = (background, imageFiles, styleObject = null, bgMap = {
  color: (props, val) => handleColor(props, val, 'backgroundColor'),
  size: handleBackgroundSize,
  position: handleBackgroundPosition,
  repeat: handleBackgroundRepeat,
  clip: (props, val) => {
    Object.assign(props, {
      webkitBackgroundClip: val,
      backgroundClip: val,
    });
  },
  image: handleBackgroundImages,
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
