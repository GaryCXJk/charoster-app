export const handleElementRatios = (ratio, styleObject = null) => {
    const styleProps = [];
    if (typeof ratio === 'object') {
        styleProps.aspectRatio = `${ratio.width} / ${ratio.height}`;
    } else {
        styleProps.aspectRatio = ratio;
    }
    if (styleObject) {
        Object.assign(styleObject, styleProps);
    }
    return styleProps;
}

export const handleElement = (style, styleObject = null) => {
  const {
    width = null,
    height = null,
    left = null,
    right = null,
    top = null,
    bottom = null,
    ratio = null,
    overlay = false,
    onTop = false,
    underlay = false,
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
  if (newStyle.left === newStyle.right && newStyle.top === newStyle.bottom && newStyle.left === newStyle.top) {
    newStyle.inset = newStyle.left;
    delete newStyle.left;
    delete newStyle.right;
    delete newStyle.top;
    delete newStyle.bottom;
  }

  if (ratio) {
    handleElementRatios(ratio, newStyle);
  }
  if (overlay) {
    newStyle.position = 'absolute';
  }
  if (onTop) {
    newStyle.zIndex = 1;
  }
  if (underlay) {
    newStyle.position = 'absolute';
    newStyle.zIndex = -1;
  }
  if (contain) {
    newStyle.overflow = 'hidden';
  }

  if (styleObject) {
    Object.assign(styleObject, newStyle);
  }

  return newStyle;
}
