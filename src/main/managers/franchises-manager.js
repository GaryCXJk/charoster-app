import createWaiter from '@@helpers/create-waiter';
import { fetchEntities, loadEntity, queueEntity } from './file-manager';

const franchises = {};
const franchiseQueue = [];
const waiting = {};

let queueIsRunning = null;

export const fetchFranchises = async (packFolder) => {
  return await fetchEntities('franchises', packFolder);
}

const loadFranchise = async (franchiseId) => {
  return loadEntity('franchises', waiting, franchises, franchiseId);
}

const runFranchiseQueue = async () => {
  if (queueIsRunning) {
    return;
  }
  queueIsRunning = createWaiter();
  while (franchiseQueue.length) {
    const franchiseId = franchiseQueue.shift();
    await loadFranchise(franchiseId);
  }
  queueIsRunning.resolve();
  queueIsRunning = null;
}

export const queueFranchise = (franchiseId) => {
  queueEntity(franchiseQueue, waiting, franchiseId);

  runFranchiseQueue();
}
