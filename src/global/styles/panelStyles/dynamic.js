export default (currentRoster, roster, returnStyle) => {
  const { width: baseWidth, height: baseHeight, meta = {} } = currentRoster;
  let [ width, height ] = [ baseWidth, baseHeight ];

  let rowColRatio = [height, width];
  if (meta.rowColRatio && Array.isArray(meta.rowColRatio)) {
    rowColRatio[0] = meta.rowColRatio[0] ?? rowColRatio[0];
    rowColRatio[1] = (meta.rowColRatio[1] ?? rowColRatio[1]) || 1;
  }
  const rcRatio = rowColRatio[0] / rowColRatio[1];

  let totalCells = width * height;

  while (roster.length > totalCells) {
    const ratio = height / width;
    if (ratio > rcRatio) {
        width++;
    } else {
        height++;
    }
    totalCells = width * height;
  }

  returnStyle.panels = {
    width: `${100 / width}%`,
    height: `${100 / height}%`,
    fontMod: baseWidth / width,
  };
}
