export const franchises = {
  id: "franchise",
  name: "Franchise",
  folder: "franchises",
  merge: "auto",
  discover: "franchises",
  list: true,
  fields: {
    name: "string",
    symbols: {
      name: "Symbol",
      type: "image,svg",
      entityProp: "symbol"
    }
  }
};
