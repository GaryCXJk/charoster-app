export const getPositionString = (val) => {
  if (typeof val === 'object') {
    let { top = 0, left = null, bottom = null, right = null } = val;
    left = left ?? top;
    bottom = bottom ?? top;
    right = right ?? left;
    return `${top} ${right} ${bottom} ${left}`;
  } else if (typeof val === 'string' || typeof val === 'number') {
    return `${val}`;
  }
  return null;
};

export const handleSpacing = (spacing, imageFiles, styleObject = null, prefix = null) => {
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
