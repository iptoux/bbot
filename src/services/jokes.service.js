import fs from 'fs';
import path from 'path';

let jokesCache = null;

function loadJokes() {
  if (jokesCache) return jokesCache;
  const file = path.resolve(process.cwd(), 'jokes.json');
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const list = JSON.parse(raw);
    jokesCache = Array.isArray(list) ? list : [];
  } catch {
    jokesCache = [];
  }
  return jokesCache;
}

export function getAllJokes() {
  return loadJokes();
}

export function getRandomJoke() {
  const jokes = loadJokes();
  if (!jokes.length) return null;
  const idx = Math.floor(Math.random() * jokes.length);
  return jokes[idx];
}
