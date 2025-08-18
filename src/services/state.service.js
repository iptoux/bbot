import { config } from '../config/index.js';

let enabled = true;
const startedAt = Date.now();

export const state = {
  isEnabled: () => enabled,
  enable: () => (enabled = true),
  disable: () => (enabled = false),
  getUptimeMs: () => Date.now() - startedAt,
  getVersion: () => config.VERSION,
  async restart(mode = config.RESTART_MODE, client) {
    const m = (mode || 'soft').toLowerCase();
    if (m === 'soft') {
      try {
        if (client) {
          await client.destroy();
          await client.login(config.DISCORD_TOKEN);
        }
        return { ok: true, mode: 'soft' };
      } catch (e) {
        return { ok: false, mode: 'soft', error: e?.message || String(e) };
      }
    }
    if (m === 'hard') {
      setTimeout(() => process.exit(0), 100);
      return { ok: true, mode: 'hard' };
    }
    return { ok: false, error: 'invalid mode' };
  }
};
