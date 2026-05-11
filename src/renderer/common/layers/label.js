import { getLabel, getLabelText } from "../../components/panels/processing/layers/label";
import { imageLabel } from "../../components/panels/processing/layers/label";

export default async (block, layerInfo, {
  panelEntity,
  type,
  entity,
  imageId,
  showLabel = true,
  label = null,
}) => {
  if (showLabel) {
    const displayLabel = await getLabelText(
      layerInfo.caps ?? true,
      label,
      (caps) => caps ? (
        (layerInfo.text ? layerInfo.text.toUpperCase() : null)
        ?? (panelEntity?.allCapsName ?? null)
        ?? (panelEntity?.displayName ? panelEntity.displayName.toUpperCase() : null)
      ) : (
        layerInfo.text ?? panelEntity?.displayName ?? null
      ),
      async (caps) => await getLabel(type, entity, imageId, caps)
    );

    block.prop('textContent', displayLabel);
    if (layerInfo.display === 'image') {
      block.prop('textContent', '');
      const labelStyle = {};
      if (layerInfo.fontColor) {
        labelStyle.fontColor = layerInfo.fontColor;
      }
      const labelUrl = await imageLabel({
        label: displayLabel,
        ...labelStyle,
      });

      const labelImage = document.createElement('img');
      labelImage.className = 'label-image';
      labelImage.src = labelUrl;
      block.append(labelImage);
    }

    return block;
  }
  return null;
};

export const labelModifier = (_layerInfo, { showLabel = true }) => ({
    shown: showLabel,
});