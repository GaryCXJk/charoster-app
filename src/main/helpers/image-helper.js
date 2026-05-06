const imageQualityPresets = {
    low: 55,
    medium: 70,
    high: 85,
    best: 100,
};

export const getWebpOptions = (quality) => {
    let realQuality = 85;
    if (Object.prototype.hasOwnProperty.call(imageQualityPresets, quality)) {
        realQuality = imageQualityPresets[quality];
    } else {
        const configuredQuality = +quality;
        realQuality = Number.isFinite(configuredQuality)
            ? Math.max(1, Math.min(100, Math.round(configuredQuality)))
            : 85;
    }
    return realQuality === 100 ? { lossless: true } : { quality: realQuality, effort: 4 };
};

export const applyImageModifiers = async (image, modifiers = []) => {
    let output = image;
    for (let idx = 0; idx < modifiers.length; idx += 1) {
        const modifier = modifiers[idx];
        if (typeof modifier !== 'function') {
            continue;
        }
        const modified = await modifier(output);
        if (modified) {
            output = modified;
        }
    }
    return output;
};

export const createEnsureExtractBoundsModifier = (sizeData, sourceMeta) => {
    return async (image) => {
        if (!sizeData || !sourceMeta) {
            return image;
        }

        if (sizeData.x >= 0 && sizeData.y >= 0
            && sizeData.x + sizeData.width <= sourceMeta.width
            && sizeData.y + sizeData.height <= sourceMeta.height
        ) {
            return image;
        }

        const extendData = {
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0,
            },
        };

        if (sizeData.x < 0) {
            extendData.left = Math.abs(sizeData.x);
            sizeData.width -= extendData.left;
            sizeData.x = 0;
        }
        if (sizeData.y < 0) {
            extendData.top = Math.abs(sizeData.y);
            sizeData.height -= extendData.top;
            sizeData.y = 0;
        }
        if (sizeData.x + sizeData.width > sourceMeta.width) {
            extendData.right = sizeData.x + sizeData.width - sourceMeta.width;
            sizeData.width -= extendData.right;
        }
        if (sizeData.y + sizeData.height > sourceMeta.height) {
            extendData.bottom = sizeData.y + sizeData.height - sourceMeta.height;
            sizeData.height -= extendData.bottom;
        }

        return image.extend(extendData);
    };
};

export const createExtractModifier = (sizeData) => {
    return async (image) => {
        return image.extract({
            left: sizeData.x,
            top: sizeData.y,
            width: sizeData.width,
            height: sizeData.height,
        });
    };
};

export const createEncodeWebpModifier = (webpOptions) => {
    return async (image) => image.webp(webpOptions);
};

export const createResizeToMaxWidthModifier = (maxWidth = null) => {
    return async (image) => {
        if (!maxWidth) {
            return image;
        }
        const meta = await image.metadata();
        if (meta.width > maxWidth) {
            return image.resize({
                width: maxWidth,
            });
        }
        return image;
    };
};
