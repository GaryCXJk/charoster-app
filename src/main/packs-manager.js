import deepmerge from 'deepmerge';
import { readdir, readFile, stat } from 'fs';
import * as path from 'path';
import { getConfig } from './config-manager';
import { notifyWindow } from './window-manager';

const packs = {};
const characters = {};
const franchises = {};
const stages = {};
const designs = {};

export const fetchPack = async (folder) => {
  const workFolder = getConfig('workFolder');

  const packPath = path.join(workFolder, 'packs', folder);
  const packInfoPath = path.join(packPath, 'info.json');

  const packInfo = await new Promise((resolve) => {
    readFile(packInfoPath, {
      encoding: 'utf-8',
    }, (err, data) => {
      if (err) {
        return resolve(null);
      }
      try {
        const json = JSON.parse(data);

        return resolve(json);
      } catch (_e) {
        return resolve(null);
      }
    });
  });

  if (!packInfo) {
    return false;
  }

  packInfo.status = 'loading';
  packs[packInfo.id ?? folder] = packInfo;

  notifyWindow('pack-loading', deepmerge({}, packInfo));
}

export const discoverPacks = async () => {
  const workFolder = path.join(getConfig('workFolder'), 'packs');

  const files = await new Promise((resolve) => {
    readdir(workFolder, (err, files) => {
      if (err) {
        return resolve([]);
      }
      return resolve(files.filter(async (file) => {
        return await new Promise((subResolve) => {
          stat(path.join(workFolder, file), (err, fileStats) => {
            if (err) {
              return subResolve(false);
            }
            return subResolve(fileStats.isDirectory());
          });
        });
      }));
    });
  });

  for (let idx = 0; idx < files.length; idx+= 1) {
    const file = files[idx];
    const pack = await fetchPack(file);
    notifyWindow('pack-ready', deepmerge({}, pack));
  }
}
