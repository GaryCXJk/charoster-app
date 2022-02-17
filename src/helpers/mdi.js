import { SVG } from "@svgdotjs/svg.js"

export default ({
  attributes,
  content,
}) => {
  const dummy = document.createElement('div');
  SVG().size(attributes.width, attributes.height).viewbox(attributes.viewBox).svg(content).addTo(dummy);
  const svg = dummy.children[0];
  svg.classList.add('icon');
  return svg;
}
