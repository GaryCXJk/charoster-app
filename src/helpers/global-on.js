const globalOn = (event, callback) => {
  window.globalEventHandler.on(event, callback);
};

export const globalAppReset = (callback) => {
  let isAttached = false;
  return () => {
    if (!isAttached) {
      isAttached = true;
      globalOn('reset-all', callback);
    }
  };
};

export default globalOn;
