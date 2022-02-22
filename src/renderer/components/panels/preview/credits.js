import Block from "../../base/Block"
import { getImageId } from "../funcs/image-id";
import { getDesignId } from "../panelscreen";
import { getEntity } from "../processing/entities";
import { getImage } from "../processing/layers/image";
import { siDeviantart, siTwitter, siYoutube } from 'simple-icons/icons';
import si from "../../../../helpers/si";

const gatherCredits = (entity, imageId) => {
  const segments = imageId.split('>');
  const index = segments.pop();
  const fullId = segments.join('>');
  const creditsData = [];
  const credits = [];
  const imageUrls = [];

  const imagesData = entity.imageMap[fullId];
  if (imagesData) {
    const imageData = imagesData.images[index];
    if (imageData && typeof imageData === 'object' && imageData.credits) {
      creditsData.push(...imageData.credits);
    }
    if (imagesData.credits) {
      creditsData.push(...imagesData.credits);
    }
  }
  if (entity.credits) {
    creditsData.push(...entity.credits);
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
  const match = href.match(/^https?:\/\/(?:www\.)?(.+?)(?:\/.*?)?$/);
  if (match) {
    let elem = null;
    let src = null;
    switch (match[1]) {
      case 'youtube.com':
      case 'youtu.be':
        elem = si(siYoutube);
        break;
      case 'twitter.com':
        elem = si(siTwitter);
        break;
      case 'deviantart.com':
        elem = si(siDeviantart);
        break;
    }
    if (!elem && src) {
      elem = new Block({
        element: 'img',
        src: `/assets/images/${src}`,
      });
    }
    if (elem) {
      return elem;
    }
  }
  console.log(href, match);
  return null;
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

  const { entityId } = entity;
  const entityInfo = await getEntity(type, entityId);
  const imageId = entity.imageId ?? getImageId(entityInfo);
  const creditsData = gatherCredits(entityInfo, imageId);

  creditsData.credits.forEach((credit) => {
    const block = createCreditsBlock(credit.artist ?? null, credit.artistUrls ?? []);

    if (block) {
      content.append(block);
    }
  });

  if (creditsData.imageUrls.length) {
    const block = createCreditsBlock('Image URLs:', creditsData.imageUrls);

    if (block) {
      content.append(block);
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
