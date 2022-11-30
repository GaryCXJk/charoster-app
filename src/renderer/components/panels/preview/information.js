import Block from "../../base/Block";
import { getImageId } from "../funcs/image-id";
import { getEntity } from "../processing/entities";

export const createHeader = (layer) => {
  const container = new Block({
    element: 'h2',
    textContent: layer.label ?? '',
  });

  return container;
};

const createContent = (layer, monitorElements) => {
  const {
    value = 'text',
  } = layer;

  const container = new Block({
    className: 'information-content-container',
  });

  const content = new Block({
    className: `information-content information-content-${value}`,
  });
  container.append(content);

  container.setPreview = async (type, entity) => {
    content.empty();

    const { entityId = null } = entity ?? {};
    if (entityId === null) {
      return;
    }
    const entityInfo = await getEntity(type, entityId);
    const imageId = entity.imageId ?? getImageId(entityInfo);
    const segments = imageId.split('>');
    const index = segments.pop();
    const fullId = segments.join('>');
    const imagesData = entityInfo.imageMap[fullId];

    let contentStr = layer[value] ?? null;
    if (imagesData) {
      const imageData = imagesData.images[index];
      if (imageData) {
        contentStr = contentStr ?? imageData[value] ?? null;
      }
      contentStr = contentStr ?? imagesData[value] ?? null;
    }

    contentStr = contentStr ?? entityInfo[value] ?? '';

    content.prop('textContent', contentStr);
  };

  container.clearPreview = () => {
    content.prop('textContent', '');
  };

  monitorElements.push(container);

  return container;
};

const createContainer = (data, monitorElements, depth = 0) => {
  const container = new Block({
    className: 'information-container',
  });

  if (data.layers) {
    data.layers.forEach((layer, idx) => {
      let element;
      switch (layer.type) {
        case 'container':
          element = createContainer(layer, monitorElements, depth + 1);
          break;
        case 'header':
          element = createHeader(layer, monitorElements);
          break;
        case 'content':
          element = createContent(layer, monitorElements);
          break;
        default:
          break;
      }
      if (element) {
        if (layer.className) {
          element.element.classList.add(...layer.className.split(' '));
        }
        element.element.classList.add('layer', `layer-${idx}`, `layer-${depth}`);
        container.append(element);
      }
    });
  }

  return container;
}
export default createContainer;
