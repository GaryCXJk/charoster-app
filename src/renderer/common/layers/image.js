import { getImage, processImageDefinitionLayer } from "../../components/panels/processing/layers/image";

export default async (block, layerInfo, {
    type,
    entityId,
    imageId = null,
    entity,
    callbacks,
    designId = '',
    panelEntity = null,
}) => {
    let panelImageId = imageId;

    if (!panelImageId && callbacks.setImage) {
        panelImageId = callbacks.setImage({
        entity,
        });
    }

    if (panelImageId) {
        let usedSizes = ['raw'];
        let imageData = null;
        let imageStr = null;
        if (layerInfo.from?.definition && layerInfo.from?.field) {
        imageStr = await processImageDefinitionLayer(layerInfo, type, panelEntity ?? {
            entityId,
            imageId,
        });
        } else if (layerInfo.file) {
        imageData = await getImage('designs', `${designId}>${layerInfo.file}`, designId);
        } else {
        imageData = await getImage(type, panelImageId, designId);
        usedSizes = layerInfo.size ?? usedSizes;
        }

        if (imageData) {
        let imageSize = null;
        for (let idx = 0; idx < usedSizes.length; idx += 1) {
            const size = usedSizes[idx];
            if (imageData[size]) {
            imageSize = imageData[size];
            break;
            }
        }
        if (imageSize) {
            imageStr = imageSize.file ?? imageSize.data;
        } else {
            imageStr = imageData.file ?? imageData.data ?? null;
        }
        }
        if (imageStr) {
        block.element.style.backgroundImage = `url(${imageStr})`;
        }
    }
    return block;
};

export const imageModifier = (layerInfo, { type }) => ({
    shown: true,
    className: !layerInfo.file ? `image image-${type}` : null,
});