import Block from "../../components/base/Block";
import { getImageId } from "../../components/panels/funcs/image-id";
import createPanelScreen, { getCurrentRoster, setCurrentWorkspace } from "../../components/panels/panelscreen";
import { createPreviewCredits, gatherCredits } from "../../components/panels/preview/credits";
import { getEntity } from "../../components/panels/processing/entities";
import { getImage } from "../../components/panels/processing/layers/image";
import "./render.scss";

export default () => {
  const container = new Block({
    className: 'sections',
  });

  const elements = createPanelScreen();

  container.append(elements.content);
  container.append(elements.style);

  const creditsContainer = new Block({
    className: 'credits-placeholder unbound',
  });

  window.globalEventHandler.on('sync-workspace', (workspace) => {
    setCurrentWorkspace(workspace, false, true);
  });

  window.globalEventHandler.on('request-credits-size', async () => {
    creditsContainer.empty();
    container.append(creditsContainer);
    creditsContainer.element.classList.add('unbound');
    const { roster, type } = getCurrentRoster();
    for (let idx = 0; idx < roster.length; idx += 1) {
      const entity = roster[idx];
      const entityInfo = await getEntity(type, entity.entityId);
      const imageId = entity.imageId ?? getImageId(entityInfo);
      const creditsData = gatherCredits(entityInfo, imageId);

      if (!creditsData.imageUrls.length && !creditsData.credits.length) {
        continue;
      }
      let displayLabel = null;
      if (imageId) {
        const imageInfo = await window.packs.getImageInfo(type, imageId);
        displayLabel = displayLabel ?? imageInfo.displayName ?? null;
      }
      displayLabel = displayLabel ?? entityInfo.displayName ?? entityInfo.name ?? entityInfo.id;
      const imageData = await getImage(type, imageId);

      const entityBlock = new Block({
        className: 'credits-group',
      });
      creditsContainer.append(entityBlock);

      const header = new Block({
        element: 'h2',
        textContent: displayLabel,
      });
      header.css({
        backgroundImage: `url(${imageData.panel.file})`,
      });
      entityBlock.append(header);

      await createPreviewCredits(type, roster[idx], entityBlock);
    }
    const style = getComputedStyle(creditsContainer.element);
    const elementHeight = Math.ceil(+style.height.replace(/px$/, ''));

    creditsContainer.element.classList.remove('unbound');
    return elementHeight;
  });

  window.globalEventHandler.on('cleanup-credits', async () => {
    creditsContainer.empty();
    creditsContainer.detach();
    creditsContainer.element.classList.add('unbound');
  });

  return container.element;
}
