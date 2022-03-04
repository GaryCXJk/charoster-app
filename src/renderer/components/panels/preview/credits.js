import Block from "../../base/Block"
import { getImageId } from "../funcs/image-id";
import { getEntity } from "../processing/entities";
import { siArtstation, siDeviantart, siImgur, siTwitter, siYoutube } from 'simple-icons/icons';
import mdiPublic from '@material-design-icons/svg/two-tone/public.svg';
import mdi from "../../../../helpers/mdi";
import si from "../../../../helpers/si";

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
  if (imagesData) {
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

export const createPreviewCredits = async (type, entity, container = null) => {
  const content = container ?? new Block();
  content.empty();

  const { entityId } = entity;
  const entityInfo = await getEntity(type, entityId);
  const imageId = entity.imageId ?? getImageId(entityInfo);
  const creditsData = gatherCredits(entityInfo, imageId);

  if (creditsData.imageUrls.length) {
    const block = createCreditsBlock(`Image URL${creditsData.imageUrls.length === 1 ? '' : 's'}:`, creditsData.imageUrls);

    if (block) {
      content.append(block);
    }
  }

  creditsData.credits.forEach((credit) => {
    const block = createCreditsBlock(credit.artist ?? null, credit.artistUrls ?? []);

    if (block) {
      content.append(block);
    }
  });

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

export default (data, monitorElements) => {
  const container = new Block({
    className: 'credits-container',
  });

  if (data.layers) {
    data.layers.forEach((layer, idx) => {
      let element;
      switch (layer.type) {
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
        element.element.classList.add('layer', `layer-${idx}`);
        container.append(element);
      }
    });
  }

  return container;
}
