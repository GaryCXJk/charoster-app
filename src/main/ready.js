import { app, protocol, session } from "electron";
import * as path from 'path';
import { lookup } from 'mime-types';
import { getTempPath } from "./managers/config-manager";
import { getAltImage } from './managers/entity-manager';
import { getFileBuffer, setBufferWaiter } from './managers/file-manager';

export default () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:; img-src 'self' blob: data:"]
      },
    });
  });

  protocol.interceptBufferProtocol(app.name, async (request, callback) => {
    const url = request.url.slice(app.name.length + 3);
    const match = url.match(/^([\w\d\-]+?)\/([\w\d\-\/]+)\/([\w\d\-]+)\/(\d+|max)\/(\d+)\.(png|jpg|jpeg|webp)$/);
    if (!match) {
      const file = path.join(getTempPath(), url.replace(/\//g, '--'));
      const buffer = await getFileBuffer(file);
      if (!buffer) {
        callback({ error: 404 });
      } else {
        callback({ mimeType: lookup(url), data: buffer });
      }
      return;
    }

    let buffer;
    await setBufferWaiter(url, async () => {
      try {
        buffer = await getAltImage(match[1], match[2].replace(/\//g, '>'), match[3]);
      } catch (e) {
        console.log(e);
      }
    });
    if (!buffer) {
      callback({ error: 404 });
      return;
    }
    callback({ mimeType: lookup(url), data: buffer });
  });
  protocol.interceptBufferProtocol(`${app.name}-renderer`, async (request, callback) => {
    const url = request.url.slice(app.name.length + 12);
    const match = url.match(/^([\w\d\-]+?)\/([\w\d\-\/]+)\/([\w\d\-]+)\/(\d+|max)\/(\d+)\.(png|jpg|jpeg|webp)$/);
    if (!match) {
      callback({ error: 404 });
      return;
    }
    let buffer;
    try {
      buffer = await getAltImage(match[1], match[2].replace(/\//g, '>'), match[3], true);
    } catch (e) {
      console.log(e);
    }
    if (!buffer) {
      callback({ error: 404 });
      return;
    }
    callback({ mimeType: lookup(url), data: buffer });
  });
}
