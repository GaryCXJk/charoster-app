const transparencyToAlpha = (opacity) => {
  if (typeof opacity === 'number') {
    return 1 - opacity;
  }
  if (typeof opacity === 'string') {
    let num = null;
    if (opacity.endsWith('%')) {
      num = +opacity.slice(0, -1) / 100;
    } else {
      num = +opacity;
    }
    if (num !== null && !Number.isNaN(num)) {
      return 1 - num;
    }
  }
  return null;
};

export const getColorValue = (color) => {
  if (typeof color === 'object') {
    const { model, ...colorProps } = color;
    switch (model) {
      case 'rgb':
      case 'rgba':
        return `rgba(${colorProps.r}, ${colorProps.g}, ${colorProps.b}, ${colorProps.alpha ?? colorProps.opacity ?? transparencyToAlpha(colorProps.transparency) ?? colorProps.a ?? 1})`;
      case 'hsl':
      case 'hsla':
        return `hsla(${colorProps.h}, ${colorProps.s}%, ${colorProps.l}%, ${colorProps.alpha ?? colorProps.opacity ?? transparencyToAlpha(colorProps.transparency) ?? colorProps.a ?? 1})`;
      case 'hwb':
      case 'hwba':
        return `hwba(${colorProps.h} ${colorProps.w}% ${colorProps.b}% / ${colorProps.alpha ?? colorProps.opacity ?? transparencyToAlpha(colorProps.transparency) ?? colorProps.a ?? 1})`;
      case 'lab':
      case 'laba':
        return `laba(${colorProps.l} ${colorProps.a} ${colorProps.b} / ${colorProps.alpha ?? colorProps.opacity ?? transparencyToAlpha(colorProps.transparency) ?? 1})`;
      case 'lch':
      case 'lcha':
        return `lcha(${colorProps.l} ${colorProps.c} ${colorProps.h} / ${colorProps.alpha ?? colorProps.opacity ?? transparencyToAlpha(colorProps.transparency) ?? colorProps.a ?? 1})`;
      case 'oklab':
      case 'oklaba':
        return `oklaba(${colorProps.l} ${colorProps.a} ${colorProps.b} / ${colorProps.alpha ?? colorProps.opacity ?? transparencyToAlpha(colorProps.transparency) ?? 1})`;
      case 'oklch':
      case 'oklcha':
        return `oklcha(${colorProps.l} ${colorProps.c} ${colorProps.h} / ${colorProps.alpha ?? colorProps.opacity ?? transparencyToAlpha(colorProps.transparency) ?? colorProps.a ?? 1})`;
      case 'hex': {
        const hexValue = colorProps.hex ?? colorProps.value ?? null;
        if (!hexValue) {
          return null;
        }
        return hexValue.startsWith('#') ? hexValue : `#${hexValue}`;
      }
      default:
        return null;
    }
  } else if (typeof color === 'string') {
    return color;
  }
  return null;
};

export const handleColor = (props, val, colorProp = 'color') => {
  const colorValue = getColorValue(val);
  if (colorValue) {
    props[colorProp] = colorValue;
  }
  return props;
};
