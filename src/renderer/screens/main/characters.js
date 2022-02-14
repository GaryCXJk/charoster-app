export const getImageId = (character) => {
  let costumeId = character.defaultCostume;

  if (!costumeId && character.costumes && character.costumes) {
    character.costumes.every((costume) => {
      if (costume.images && costume.images.length) {
        costumeId = `${costume.fullId}>0`;
        return false;
      }
      return true;
    });
  }

  return costumeId;
}
