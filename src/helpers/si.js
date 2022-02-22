import { SVG } from "@svgdotjs/svg.js"

export default ({
  hex,
  path,
}, color = null) => {
  const dummy = document.createElement('div');
  const draw = SVG();
  draw.size(24, 24).viewbox('0 0 24 24').addTo(dummy).path(path).fill(color ?? `#${hex}`);
  const svg = dummy.children[0];
  svg.classList.add('icon');
  return svg;
}
