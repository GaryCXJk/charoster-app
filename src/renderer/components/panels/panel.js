import deepmerge from 'deepmerge';
import { globalAppReset } from '../../../helpers/global-on';
import { getDefaultPanelLayout } from '../../../global/styles/layouts/panels';
import Block from "../base/Block";
import { clearImageLabels } from './processing/layers/label';
import { panelLayers, panelModifiers } from '../../common/layers';

let applyEvents = globalAppReset(() => {
  clearImageLabels();
});

const setPanelContent = async ({
  panel,
  panelEntity,
  type,
  entityId = null,
  callbacks = {},
  design: designPromise = null,
  ...props
}) => {
  if (entityId === null) {
    panel.element.classList.add('empty');
    return null;
  }
  let design = null;
  if (designPromise) {
    design = await designPromise;
  }
  const layers = design?.panels?.layers ?? getDefaultPanelLayout() ?? [];

  let entity = null;

  if (callbacks.setEntity) {
    entity = await callbacks.setEntity(entityId);
  }

  if (!entity) {
    return null;
  }

  entity = deepmerge({}, entity);

  if (callbacks.preprocessEntity) {
    callbacks.preprocessEntity(entity);
  }

  const blockPromises = [];
  const contentProps = {
    panelEntity: panelEntity,
    type,
    entity,
    design,
    properties: design?.panels?.properties ?? {},
    callbacks,
    modifiers: panelModifiers,
    layerFunctions: panelLayers,
    ...props
  };

  blockPromises.push(
    panelLayers.container(panel, {
      layers,
    }, contentProps)
  );

  await Promise.all(blockPromises);
};

export const createPanel = ({
  type,
  entityId = null,
  imageId = null,
  draggable = false,
  callbacks = {},
  ...options
}) => {
  applyEvents();
  const panel = new Block({
    className: 'panel',
    draggable: draggable,
    on: callbacks.panel ?? {},
  });

  setPanelContent({
    ...options,
    panel,
    type,
    entityId,
    imageId,
    callbacks: callbacks.image ?? {},
  });

  return panel;
}
