export default () => {
  const validStates = [
    'running',
    'paused',
    'stopped',
  ];
  let state = 'init';
  let status = 'pending';
  let promiseData = null;
  const data = {};
  const promise = new Promise((resolve, reject) => {
    Object.assign(data, {
      resolve,
      reject,
    });
  });
  Object.assign(promise, data);
  Object.defineProperty(promise, 'value', {
    get: () => promiseData,
  });
  Object.defineProperty(promise, 'status', {
    get: () => status,
  });
  Object.defineProperty(promise, 'state', {
    get: () => state,
  });
  Object.defineProperty(promise, 'hasFinished', {
    get: () => status !== 'pending',
  });

  promise.setState = (newState) => {
    if (validStates.includes(newState)) {
      state = newState;
    }
  };

  promise.then((value) => {
    status = 'resolved';
    state = 'stopped';
    promiseData = value;
  });
  promise.catch(() => {
    status = 'rejected';
    state = 'stopped';
  });

  return promise;
}
