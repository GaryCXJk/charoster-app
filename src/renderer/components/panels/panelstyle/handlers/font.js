import { handleColor } from "./color";
import { handleStyle } from "./style";

export const handleFontStroke = (props, val, imageFiles, font) => {
  if (typeof val === 'object') {
    handleStyle({
      order: 'stroke',
      ...val
    }, imageFiles, props, {
      width: 'webkitTextStrokeWidth',
      color: (props, val) => handleColor(props, val, 'webkitTextStrokeColor'),
      order: 'paintOrder',
    });
  } else if (typeof val === 'string') {
    props['webkitTextStroke'] = val;
    props['paintOrder'] = 'stroke';
  }
  if (font.color) {
    handleColor(props, font.color, 'webkitTextFillColor');
  }
};

export const handleFont = (font, imageFiles, styleObject = null) => (
  handleStyle(font, imageFiles, styleObject, {
    size: 'fontSize',
    family: 'fontFamily',
    weight: 'fontWeight',
    style: 'fontStyle',
    decoration: 'textDecoration',
    color: (props, val) => handleColor(props, val, 'color'),
    alignment: 'textAlign',
    stroke: (props, val) => handleFontStroke(props, val, imageFiles, font)
  })
);
