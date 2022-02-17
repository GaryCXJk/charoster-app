export const convertImageDataArray = (imageData) => {
  const obj = {};
  imageData.forEach((img) => {
    if (!img) {
      return;
    }
    if (Array.isArray(img)) {
      Object.assign(obj, convertImageDataArray(img));
    } else {
      obj[img.fullId] = img;
    }
  });
  return obj;
}
