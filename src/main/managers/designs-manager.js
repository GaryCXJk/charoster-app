const designs = {
};
const sizes = {
  panel: 452 / 300,
  preview: 128 / 160,
};

export const getSize = async (sizeId) => {
  if (sizes[sizeId]) {
    return sizes[sizeId];
  }
  return 1;
  /*
  const sizeSegments = sizeId.split('>');
  if (sizeSegments.length === 1) {

  }
  */
}
