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

export const works = {
  id: "work",
  name: "Work",
  folder: "works",
  merge: "ignore",
  discover: "works",
  list: true,
  fields: {
    name: "string",
    description: "string",
    franchise: {
      name: "Franchise",
      type: "definition",
      value: "franchise",
      multi: false,
    },
    type: {
      name: "Type",
      type: "enum",
      options: ["movie", "tv_show", "comic_book", "video_game", "other"],
    },
    startDate: "date",
    endDate: "date"
  }
};

export const appearances = {
  id: "appearance",
  name: "Appearance",
  properties: {
    work: {
      name: "Work",
      type: "definition",
      value: "work",
      multi: false,
    },
    kind: {
      name: "Kind",
      type: "enum",
      multi: true,
      options: ["first", "last", "cameo"]
    }
  },
};
