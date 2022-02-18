export const getImageId = (entity) => {
  let altId = entity.defaultImage;

  if (!altId && entity.images) {
    entity.images.every((alt) => {
      if (alt.images && alt.images.length) {
        altId = `${alt.fullId}>0`;
        return false;
      }
      return true;
    });
  }

  return altId;
}
