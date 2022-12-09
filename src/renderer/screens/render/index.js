import Block from "../../components/base/Block";
import { getImageId } from "../../components/panels/funcs/image-id";
import createPanelScreen, { getCurrentRoster, getDesign, setCurrentWorkspace } from "../../components/panels/panelscreen";
import { createPreviewCredits, createPreviewCreditsBlock, gatherCredits, getDefinitionImageInfo, getDefinitionInfo } from "../../components/panels/preview/credits";
import { getEntity } from "../../components/panels/processing/entities";
import { getImage, getImageStr } from "../../components/panels/processing/layers/image";
import "./render.scss";

export default () => {
  const container = new Block({
    className: 'sections',
  });

  const elements = createPanelScreen();

  container.append(elements.content);
  container.append(elements.style);

  const creditsStyle = document.createElement('style');
  container.append(creditsStyle);

  const creditsContainer = new Block({
    className: 'credits-placeholder unbound',
  });

  window.globalEventHandler.on('sync-workspace', (workspace) => {
    setCurrentWorkspace(workspace, false, true);
  });

  window.globalEventHandler.on('request-credits-size', async (options = {}) => {
    creditsStyle.innerHTML = '';
    const creditsCSS = [];
    if ((!!+options.columns) && +options.columns !== 3) {
      const fontSize = +(((0.7 * 3) / options.columns).toFixed(4));
      creditsCSS.push(`#app.render .credits-placeholder {
  font-size: ${fontSize}em;
  columns: ${options.columns};
}`);
    }
    if (!!creditsCSS.length) {
      creditsStyle.innerHTML = creditsCSS.join('\n');
    }
    creditsContainer.empty();
    container.append(creditsContainer);
    creditsContainer.element.classList.add('unbound');
    const { roster, type } = getCurrentRoster();
    const definitions = {};
    const definitionCredits = {};
    const design = await getDesign();

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

    for (let idx = 0; idx < roster.length; idx += 1) {
      const entity = roster[idx];
      if (!entity) {
        continue;
      }
      const entityInfo = await getEntity(type, entity.entityId);
      const imageId = entity.imageId ?? getImageId(entityInfo);
      const creditsData = gatherCredits(entityInfo, imageId);

      if (creditsData.imageUrls.length && creditsData.credits.length) {
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
          backgroundImage: `url(${imageData.panel?.file ?? imageData.preview?.file ?? imageData.raw?.file})`,
        });
        entityBlock.append(header);

        await createPreviewCredits(type, roster[idx], entityBlock, false, false);
      }

      await designImports.reduce(async (promise, designImport) => {
        await promise;

        if (!definitions[designImport.definition]) {
          definitions[designImport.definition] = await window.definitions.getDefinition(designImport.definition);
        }
        const definitionInfo = definitions[designImport.definition];
        const imageId = await getDefinitionImageInfo(entityInfo, entity, designImport, definitionInfo);
        if (definitions[designImport.definition]?.fields?.[designImport.field]) {
          const definition = definitions[designImport.definition];
          const field = definition.fields[designImport.field];
          const defName = `${designImport.definition}:${designImport.field}`;
          definitionCredits[defName] = definitionCredits[defName] ?? [];
          if (!definitionCredits[defName].find((entry) => entry.imageId === imageId)) {
            const definitionCreditsItem = await getDefinitionInfo(designImport, entityInfo[designImport.definition], entityInfo);
            if (definitionCreditsItem[imageId].credits) {
              definitionCredits[defName].push({
                imageId,
                ...definitionCreditsItem[imageId],
                name: `${definition.name}: ${definitionCreditsItem[imageId].name} > ${field.name}`,
              });
            }
          }
        }
      }, Promise.resolve());
    }

    await designImports.reduce(async (promise, designImport) => {
      await promise;
      const defName = `${designImport.definition}:${designImport.field}`;
      if (definitions[designImport.definition]?.fields?.[designImport.field]) {
        const defList = definitionCredits[defName];

        await defList.reduce(async (subPromise, imageInfo) => {
          await subPromise;
          if (!imageInfo.credits) {
            return;
          }
          const {
            imageId,
            name,
            credits,
          } = imageInfo;
          const pickedImage = await window.definitions.getDefinitionEntity(designImport.definition, designImport.field, imageId);

          const entityBlock = new Block({
            className: 'credits-group',
          });
          creditsContainer.append(entityBlock);

          const header = new Block({
            element: 'h2',
            textContent: name,
          });
          entityBlock.append(header);
          const computedStyle = getComputedStyle(entityBlock.element);

          const imageStr = getImageStr(pickedImage, {
            color: computedStyle.color,
          });

          header.css({
            backgroundImage: `url(${imageStr})`,
          });

          createPreviewCreditsBlock(credits, entityBlock);

        }, Promise.resolve());
      }
    }, Promise.resolve());

    const style = getComputedStyle(creditsContainer.element);
    const elementHeight = Math.ceil(+style.height.replace(/px$/, ''));

    creditsContainer.element.classList.remove('unbound');
    return elementHeight;
  });

  window.globalEventHandler.on('cleanup-credits', () => {
    creditsContainer.empty();
    creditsContainer.detach();
    creditsContainer.element.classList.add('unbound');
  });

  return container.element;
}
