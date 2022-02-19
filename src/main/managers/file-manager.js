import { readdir, readFile, stat } from 'fs/promises';
import * as path from 'path';
import deepmerge from 'deepmerge';
import createWaiter from '@@helpers/create-waiter';
import { getConfig } from './config-manager';
import { showError } from './error-manager';

/**
 *
 * @param {string} type
 * @param {string} packFolder
 * @returns
 */
export const fetchEntities = async (type, packFolder) => {
  const workFolder = path.join(getConfig('workFolder'), 'packs', packFolder, type);

  const entityIds = [];
  try {
    const foundFiles = await readdir(workFolder);

    for (let idx = 0; idx < foundFiles.length; idx += 1) {
      const file = foundFiles[idx];

      if (!file.match(/\.json$/)) {
        continue;
      }

      try {
        const fileStats = await stat(path.join(workFolder, file));

        if (fileStats.isFile()) {
          entityIds.push(`${packFolder}>${file.replace(/\.json$/, '')}`);
        }
      } catch (_e) {
        // Do nothing
      }
    }
  } catch (_e) {
    // Do nothing
  }
  return entityIds;
}

export const loadEntity = async (entityType, entityWaiting, entities, fullEntityId, callbacks = {}) => {
  try {
    if (!entityWaiting[fullEntityId]) {
      entityWaiting[fullEntityId] = createWaiter();
    }
    if (entityWaiting[fullEntityId].state === 'init') {
      entityWaiting[fullEntityId].setState('running');
      const waiter = entityWaiting[fullEntityId];
      const [folder, entityId] = fullEntityId.split('>');

      const workFolder = getConfig('workFolder');

      const entityPath = path.join(workFolder, 'packs', folder, entityType);
      const entityInfoPath = path.join(entityPath, `${entityId}.json`);

      let entityInfoStr;
      let entityInfo;
      try {
        entityInfoStr = await readFile(entityInfoPath, {
          encoding: 'utf-8',
        });
      } catch (_e) {
        waiter.resolve();
        showError(`The file ${entityInfoPath} could not be found`);

        return null;
      }

      try {
        entityInfo = JSON.parse(entityInfoStr);
      } catch(e) {
        waiter.resolve();
        showError(`There was an error loading ${entityInfoPath}`);

        return null;
      }

      if (callbacks.processEntity) {
        return callbacks.processEntity(entityInfo);
      }

      entities[fullEntityId] = entityInfo;

      entityWaiting[fullEntityId].resolve(entityInfo);
      return deepmerge({}, entityInfo);
    } else {
      if (callbacks.onProgressEntity) {
        return callbacks.onProgressEntity();
      }
      return entities[fullEntityId];
    }
  } catch (e) {
    console.log(e);
  }
  return null;
}

/**
 * Queues an entity.
 * @param {string} entityId
 * @returns
 */
export const queueEntity = (entityQueue, entityWaiting, entityId) => {
  if (entityWaiting[entityId]) {
    return;
  }
  entityQueue.push(entityId);
  entityWaiting[entityId] = createWaiter();
}
