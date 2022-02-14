import { ipcMain } from "electron";
import traverse from "../../helpers/traverse";

const designs = {
  default: {
    panels: {
      gap: '0.25em',
      margin: '1.5em',
      image: {
        filters: [
          {
            type: 'drop-shadow',
            value: {
              x: '0.5em',
              y: '0.5em',
              radius: '0.2em',
              color: '#222',
            },
          }
        ],
      },
    },
    preview: {
      image: {
        filters: [
          {
            type: 'drop-shadow',
            value: {
              x: '0.5em',
              y: '0.5em',
              radius: '0.2em',
              color: '#222',
            },
          }
        ],
      },
    }
  },
};
const sizes = {
  characters: {
    panel: 452 / 300,
    preview: 128 / 160,
  },
};

export const getSize = async (type, sizeId) => {
  if (sizes[type][sizeId]) {
    return sizes[type][sizeId];
  }
  return null;
  /*
  const sizeSegments = sizeId.split('>');
  if (sizeSegments.length === 1) {

  }
  */
}

export const getDesign = async (designId = 'default') => {
  const sizeSegments = designId.split('>');

  const design = traverse(sizeSegments, designs);

  return design;
}

ipcMain.handle('designs:get', (_event, designId) => getDesign(designId));
