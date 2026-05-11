import Block from "../../components/base/Block";
import filterLayers from "../filterLayers";

export default async (container, layerInfo, {
  depth = 0,
  properties,
  modifiers = {},
  layerFunctions = {},
  ...contentProps
}) => {
  const {
    layers,
  } = layerInfo;
  const blockPromises = [];

  const filteredLayers = filterLayers(layers, contentProps.type, contentProps.entity, contentProps.panelEntity, properties ?? {});

  for (let idx = 0; idx < filteredLayers.length; idx += 1) {
    const layer = filteredLayers[idx];
    if (!layer) {
      continue;
    }
    const contentInfo = {
      shown: true,
      className: layer.type,
    };
    if (modifiers[layer.type]) {
      Object.assign(contentInfo, modifiers[layer.type](layer, contentProps));
    }

    if (layer.className) {
      contentInfo.className = `${contentInfo.className ?? layer.type} ${layer.className}`;
    }

    if (contentInfo.shown) {
      const block = new Block({
        className: `layer layer-${idx} layer-depth-${depth} ${contentInfo.className}`,
      });
      container.append(block);
      if (layerFunctions[layer.type]) {
        blockPromises.push(
          layerFunctions[layer.type](block, layer, {
            ...contentProps,
            properties,
            modifiers,
            layerFunctions,
            depth: depth + 1,
            layerIndex: idx,
          })
        );
      }
    }
  }

  await Promise.all(blockPromises);
};
