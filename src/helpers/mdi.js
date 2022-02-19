import { SVG } from "@svgdotjs/svg.js"

export default ({
  attributes,
  content,
}, color = null) => {
  const dummy = document.createElement('div');
  const draw = SVG();
  if (color) {
    draw.fill(color);
  }
  draw.size(attributes.width, attributes.height).viewbox(attributes.viewBox).svg(content).addTo(dummy);
  const svg = dummy.children[0];
  svg.classList.add('icon');
  return svg;
}
