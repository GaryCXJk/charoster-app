import { SVG } from '@svgdotjs/svg.js';

const svgUrls = [];

export const releaseURLs = () => {
  while (svgUrls.length) {
    URL.revokeObjectURL(svgUrls.shift());
  }
};

export default (content, layer) => {
  const draw = SVG().svg(content).first();
  if (layer.color) {
    draw.fill(layer.color);
  }
  const blob = new Blob([draw.svg()], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  svgUrls.push(url);
  return url;
}
