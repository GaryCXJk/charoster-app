export const clearObject = (obj) => {
  Object.keys(obj).forEach((key) => {
    delete obj[key];
  });
}
