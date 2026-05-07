import { getColorValue, handleColor } from "./color";
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
      case 'url':
        if (!val.file || !imageFiles[val.file]) {
          return null;
        }
        const fileInfo = imageFiles[val.file].raw;
        const fileUrl = fileInfo.file ?? fileInfo.data;
        props[prop] = processImageUrl(fileUrl);
        break;
      case 'gradient':
        const validGradients = ['linear-gradient', 'repeating-linear-gradient', 'radial-gradient', 'repeating-radial-gradient', 'conic-gradient'];
        if (!val.gradientType || !validGradients.includes(val.gradientType) || !val.value) {
          return null;
        }
        props[prop] = `${val.gradientType}(${val.value})`;
        break;
      case '9slice':
        // TODO: Implement 9-slice scaling, using border-image-slice.
        if (props !== 'backgroundImage') {
          return null;
        }
        if (!val.file || !imageFiles[val.file]) {
          return null;
        }
        const fileInfo = imageFiles[val.file].raw;
        const fileUrl = fileInfo.file ?? fileInfo.data;
        const size = props.backgroundSize || 'auto';
        const repeat = props.backgroundRepeat || 'stretch';

        delete props.backgroundSize;
        delete props.backgroundRepeat;
        
        const valid9SliceTypes = ['stretch', 'repeat', 'round', 'space'];
        const sliceType = val.sliceType && valid9SliceTypes.includes(val.sliceType) ? val.sliceType : 'stretch';
        
        props.borderImageSource = processImageUrl(fileUrl);
        props.borderImageSlice = val.slice.join(' ');
        break;
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
  repeat: 'backgroundRepeat',
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
