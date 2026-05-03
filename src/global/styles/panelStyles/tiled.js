export default (currentRoster, roster, returnStyle) => {
  const { width, height, meta = {} } = currentRoster;

  if (roster.length > width * height) {
    returnStyle.alignment.vertical = 'top';
  }
  
  returnStyle.panels = {
    width: `${100 / width}%`,
    height: `${100 / height}%`,
    fontMod: 1,
    scroll: true,
  };
};
