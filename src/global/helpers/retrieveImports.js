const retrieveImports = (layers, importList) => {
  layers.forEach((layer) => {
    if (layer.layers) {
      retrieveImports(layer.layers, importList);
    }
    if (layer.type === 'image' && layer.from && !importList.find(
      (entry) => (
        entry.definition === layer.from.definition
        && entry.field === layer.from.field
      )
    )) {
      importList.push(layer.from);
    }
  });
}

export default retrieveImports;
