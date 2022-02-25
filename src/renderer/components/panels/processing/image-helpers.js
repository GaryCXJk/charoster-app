export const convertImageDataArray = (imageData) => {
  const obj = {};
  imageData.forEach((img) => {
    if (!img) {
      return;
    }
    if (typeof img === 'object' && img.key && img.value) {
      Object.assign(obj, convertImageDataArray(img.value));
    } else if (Array.isArray(img)) {
      Object.assign(obj, convertImageDataArray(img));
    } else {
      obj[img.fullId] = img;
    }
  });
  return obj;
}
