export const handleStyle = (style, imageFiles, styleObject = null, styleMap = {}) => {
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
