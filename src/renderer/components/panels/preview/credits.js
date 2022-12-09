import Block from "../../base/Block"
import { getImageId } from "../funcs/image-id";
import { getEntity } from "../processing/entities";
import { siArtstation, siDeviantart, siImgur, siTwitter, siYoutube } from 'simple-icons/icons';
import mdiPublic from '@material-design-icons/svg/two-tone/public.svg';
import mdi from "../../../../helpers/mdi";
import si from "../../../../helpers/si";
import { getDesign } from "../panelscreen";
import { getDefaultPanelLayout } from "../panel";
import retrieveImports from "../../../../global/helpers/retrieveImports";
import defaultPreviewLayout from "./defaultLayout";
import { convertImageDataArray } from "../processing/image-helpers";

const brandMapping = {
  'artstation.com': siArtstation,
  'deviantart.com': siDeviantart,
  'imgur.com': siImgur,
  'twitter.com': siTwitter,
  'youtu.be': siYoutube,
  'youtube.com': siYoutube,
};

const labelMapping = {
  'twitter.com': (url) => {
    const match = url.match(/twitter\.com\/([\w\d]+)\/?$/);
    if (match) {
      return `@${match[1]}`;
    }
    return url;
  }
};

export const gatherCredits = (entity, imageId) => {
  const segments = imageId.split('>');
  const index = segments.pop();
  const fullId = segments.join('>');
  const creditsData = [];
  const credits = [];
  const imageUrls = [];

  const imagesData = entity.imageMap[fullId];
  if (imagesData) {
    if (imagesData.imageBase) {
      if (entity.imageMap[imagesData.imageBase]?.credits) {
        const parentCredits = entity.imageMap[imagesData.imageBase]?.credits;
        if (!Array.isArray(parentCredits)) {
          creditsData.push(parentCredits);
        } else {
          creditsData.push(...parentCredits);
        }
      }
    }
    const imageData = imagesData.images[index];
    if (imageData && typeof imageData === 'object' && imageData.credits) {
      if (!Array.isArray(imageData.credits)) {
        creditsData.push(imageData.credits);
      } else {
        creditsData.push(...imageData.credits);
      }
    }
    if (imagesData.credits) {
      if (!Array.isArray(imagesData.credits)) {
        creditsData.push(imagesData.credits);
      } else {
        creditsData.push(...imagesData.credits);
      }
    }
  }
  if (entity.credits) {
    if (!Array.isArray(entity.credits)) {
      creditsData.push(entity.credits);
    } else {
      creditsData.push(...entity.credits);
    }
  }

  creditsData.forEach((credit) => {
    const {
      imageUrls: urls,
      ...rest
    } = credit;
    credits.push(rest);
    if (urls && urls.length) {
      imageUrls.push(...urls);
    }
  });

  return {
    credits,
    imageUrls,
  };
}

export const getDefinitionEntities = async (from, values, entityInfo) => {
  return await window.definitions.getDefinitionValue(from.definition, values, from.field, entityInfo.pack ?? null, true);
}

export const getDefinitionInfoFromEntities = (definitionEntities, from) => {
  return definitionEntities.reduce((defInfo, defEnt) => {
    if (defEnt && typeof defEnt === 'object' && defEnt.key && defEnt.value && defEnt.value[from.field]) {
      const defInsertInfo = {
        name: defEnt.value.name,
      };

      if (defEnt.value.credits) {
        defInsertInfo.credits = defEnt.value.credits;
      }

      defEnt.value[from.field].forEach((defField) => {
        let fieldName = defField;
        if (typeof defField === 'string') {
          defInfo[defField] = defInsertInfo;
        } else if (typeof defField === 'object') {
          fieldName = defField.fullId;
          defInfo[fieldName] = defField.credits ? {
            ...defInsertInfo,
            credits: defField.credits,
          } : defInsertInfo;
        }
        if (defInfo[fieldName]?.credits) {
          const imageUrls = [];
          const credits = [];
          let { credits: creditsArray } = defInfo[fieldName];
          if (!Array.isArray(creditsArray)) {
            creditsArray = [creditsArray];
          }
          creditsArray.forEach((info) => {
            const {
              imageUrls: urls = null,
              ...artist
            } = info;
            if (urls) {
              imageUrls.push(...urls);
            }
            if (Object.keys(artist).length) {
              credits.push(artist);
            }
          });
          defInfo[fieldName].credits = {
            imageUrls,
            credits,
          };
        }
      });
    }

    return defInfo;
  }, {});
}

export const getDefinitionInfo = async (from, values, entityInfo) => {
  return getDefinitionInfoFromEntities(await getDefinitionEntities(from, values, entityInfo), from);
}

export const getDefinitionImageInfo = async (entityInfo, entity, from, definition) => {
  const values = entityInfo[from.definition];
  let imageId = null;
  if (values) {
    const definitionEntities = await getDefinitionEntities(from, values, entityInfo);
    const fieldInfo = definition?.fields?.[from.field] ?? null;
    if (fieldInfo && typeof fieldInfo === 'object' && fieldInfo.entityProp) {
      const fieldName = `${from.definition}:${fieldInfo.entityProp}`;
      imageId = entity[fieldName] ?? entityInfo[fieldName] ?? null;
    }
    if (!imageId) {
      if (entity[from.definition]?.[from.field]) {
        imageId = entity[from.definition][from.field];
      } else {
        definitionEntities.every((defEnt) => {
          if (!defEnt.value?.[from.field]) {
            return true;
          }
          imageId = defEnt.value[from.field][0];
          return false;
        });
      }
    }
    if (typeof imageId === 'object') {
      imageId = imageId.fullId;
    }
  }
  return imageId;
}

export const gatherDefinitionCredits = async (entityInfo, entity, from, definitions) => {
  if (!definitions[from.definition]) {
    definitions[from.definition] = await window.definitions.getDefinition(from.definition);
  }
  const definition = definitions[from.definition];
  const imageId = await getDefinitionImageInfo(entityInfo, entity, from, definition);
  const definitionInfo = await getDefinitionInfo(from, entityInfo[from.definition], entityInfo);
  return definitionInfo[imageId];
};

const getLinkIcon = (href) => {
  const regex = new RegExp(`^https?:\/\/(.+?\.)?(${Object.keys(brandMapping).join('|').replace(/\./g, '\\.')})(.+?)(?:\/.*?)?$`);
  const match = href.match(regex);
  let elem = null;
  if (match) {
    let src = null;
    if (brandMapping[match[2]]) {
      elem = si(brandMapping[match[2]]);
    }
    if (!elem && src) {
      elem = new Block({
        element: 'img',
        src: `/assets/images/${src}`,
      });
    }
  }
  if (!elem) {
    elem = mdi(mdiPublic);
  }
  if (elem) {
    return elem;
  }
}

const createCreditsBlock = (creditsLabel, links) => {
  if (!creditsLabel && !links.length) {
    return null;
  }
  const block = new Block({
    className: 'credits-block',
  });

  if (creditsLabel) {
    const label = new Block({
      element: 'p',
      className: 'credits-label',
      textContent: creditsLabel,
    });
    block.append(label);
  }

  if (links) {
    links.forEach((link) => {
      let href = null;
      let textContent = null;

      if (typeof link === 'object') {
        href = link.url;
        textContent = link.label;
      } else if (typeof link === 'string') {
        href = link;
        textContent = link;
      }

      if (!href && !textContent) {
        return;
      }

      if (href) {
        const icon = getLinkIcon(href);
        let content = null;
        if (icon) {
          content = textContent;
          textContent = null;
        }

        const a = new Block({
          element: 'a',
          className: 'credits-link',
          ...(textContent ? { textContent } : {}),
          href,
          target: '_blank',
        });
        if (icon) {
          a.append(icon);
        }
        if (content) {
          const match = content.match(/^https?:\/\/(?:www\.)?(.+?)(?:\/.*?)?$/);
          if (match) {
            if (labelMapping[match[1]]) {
              content = labelMapping[match[1]](content);
            }
          }
          a.append(content);
        }

        block.append(a);
      } else {
        const a = new Block({
          className: 'credits-link',
          textContent,
        });

        block.append(a);
      }
    });
  }

  return block;
}

export const createPreviewCreditsBlock = (creditsData, content) => {
  if (creditsData.imageUrls?.length) {
    const block = createCreditsBlock(`Image URL${creditsData.imageUrls.length === 1 ? '' : 's'}:`, creditsData.imageUrls);

    if (block) {
      content.append(block);
    }
  }

  if (creditsData.credits) {
    creditsData.credits.forEach((credit) => {
      const block = createCreditsBlock(credit.artist ?? null, credit.artistUrls ?? []);

      if (block) {
        content.append(block);
      }
    });
  }
}

export const createPreviewCredits = async (type, entity, container = null, emptyContainer = true, withDefinitions = true) => {
  const content = container ?? new Block();
  if (emptyContainer) {
    content.empty();
  }

  const { entityId = null } = entity ?? {};
  if (entityId === null) {
    return content;
  }
  const entityInfo = await getEntity(type, entityId);
  const imageId = entity.imageId ?? getImageId(entityInfo);
  const creditsData = gatherCredits(entityInfo, imageId);

  createPreviewCreditsBlock(creditsData, content);

  if (withDefinitions) {
    const design = await getDesign();
    const definitions = {};

    let designImports = design.imports;

    if (!designImports.length) {
      designImports = [];
      if (!design.panels?.layers) {
        retrieveImports(getDefaultPanelLayout(), designImports);
      }
      if (!design.preview?.layout) {
        retrieveImports(defaultPreviewLayout);
      }
    }

    if (designImports.length) {
      await designImports.reduce(async (promise, designImport) => {
        await promise;
        const definitionCreditsItem = await gatherDefinitionCredits(entityInfo, entity, designImport, definitions);
        if (definitionCreditsItem.credits && definitions[designImport.definition]?.fields?.[designImport.field]) {
          const definition = definitions[designImport.definition];
          const field = definition.fields[designImport.field];
          const label = new Block({
            element: 'p',
            className: 'credits-label',
            textContent: `${definition.name}: ${definitionCreditsItem.name} > ${field.name}`,
          });
          content.append(label);

          createPreviewCreditsBlock(definitionCreditsItem.credits, content);
        }
      }, Promise.resolve());
    }
  }

  return content;
}

const createContent = (layer, monitorElements) => {
  const container = new Block({
    className: 'credits-content-container',
  });

  const content = new Block({
    className: 'credits-content',
  });
  container.append(content);

  container.setPreview = async (type, entity) => {
    await createPreviewCredits(type, entity, content);
  };

  container.clearPreview = () => {
    content.empty();
  };

  monitorElements.push(container);

  return container;
};

const createHeader = (layer) => {
  const container = new Block({
    element: 'h2',
    textContent: layer.label ?? '',
  });

  return container;
};

const createContainer = (data, monitorElements, depth = 0) => {
  const container = new Block({
    className: 'credits-container',
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
