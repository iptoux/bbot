import { config } from '../config/index.js';

export function requireApiKey(req, res, next) {
  const key = req.header('X-API-Key');
  if (!key || key !== config.API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
