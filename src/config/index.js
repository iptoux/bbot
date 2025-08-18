import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env or env.local if present
const envFile = fs.existsSync(path.resolve(process.cwd(), 'env.local'))
  ? path.resolve(process.cwd(), 'env.local')
  : path.resolve(process.cwd(), '.env');
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

const num = (v, d) => {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : d;
};

const bool = (v, d) => {
  if (v === undefined) return d;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  return d;
};

export const config = {
  PORT: num(process.env.PORT, 3000),
  API_KEY: process.env.API_KEY || '',
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN || '',
  RESTART_MODE: process.env.RESTART_MODE || 'soft', // soft|hard
  COUNT_WHEN_DISABLED: bool(process.env.COUNT_WHEN_DISABLED, true),
  STATS_BACKEND: (process.env.STATS_BACKEND || 'json').toLowerCase(), // json|sqlite
  DATA_DIR: process.env.DATA_DIR || path.resolve(process.cwd(), 'data'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  VERSION: process.env.npm_package_version || '0.0.0'
};

// Ensure data dir exists
try {
  fs.mkdirSync(config.DATA_DIR, { recursive: true });
} catch {}

export function requireConfig() {
  const problems = [];
  if (!config.API_KEY) problems.push('API_KEY not set');
  if (!config.DISCORD_TOKEN) problems.push('DISCORD_TOKEN not set (bot features will not work)');
  if (!['soft', 'hard'].includes(config.RESTART_MODE)) problems.push('RESTART_MODE must be soft|hard');
  if (problems.length) {
    console.warn('[config] Warnings:', problems.join('; '));
  }
  return config;
}
