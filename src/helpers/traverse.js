const traverse = (segments, obj) => {
  const segs = [...segments];
  const seg = segs.shift();
  if (!obj[seg]) {
    return null;
  }
  const retObj = obj[seg];
  if (segs.length) {
    if (typeof retObj !== 'object') {
      return null;
    }
    return traverse(segs, retObj);
  }
  return retObj;
};

export default traverse;
