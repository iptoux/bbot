import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

function atomicWrite(filePath, data) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

export function createJsonStore(name) {
  const filePath = path.join(config.DATA_DIR, `${name}.json`);
  let cached = undefined;

  function read() {
    if (cached) return cached;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      cached = JSON.parse(raw);
    } catch (e) {
      cached = {};
    }
    return cached;
  }

  function write(data) {
    cached = data;
    try {
      atomicWrite(filePath, data);
    } catch (e) {
      console.error('[jsonStore] write error', e);
    }
  }

  function update(mutator) {
    const current = read();
    const next = mutator({ ...current });
    write(next);
    return next;
  }

  return { read, write, update, filePath };
}
