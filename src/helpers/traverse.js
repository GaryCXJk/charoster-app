const traverse = (segments, obj) => {
  const segs = [...segments];
  const seg = segs.shift();
  if (!obj[seg]) {
    return null;
  }
  const retObj = obj[seg];
  if (segs.length) {
    return traverse(segs, retObj);
  }
  return retObj;
};

export default traverse;
