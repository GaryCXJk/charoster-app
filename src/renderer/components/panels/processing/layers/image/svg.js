import { SVG } from '@svgdotjs/svg.js';

export default (content, layer) => {
  const draw = SVG().svg(content).first();
  if (layer.color) {
    draw.fill(layer.color);
  }
  return `data:image/svg+xml;base64,${window.btoa(draw.svg())}`;
}
