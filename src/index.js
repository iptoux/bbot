import { requireConfig } from './config/index.js';
import { startServer } from './api/server.js';

async function main() {
  requireConfig();
  const { server } = startServer();
  try {
    // Start the legacy bot (Discord + its own API on BOT_PORT)
    await import('../bot.js');
  } catch (e) {
    console.error('[index] Failed to start legacy bot:', e?.message || e);
  }

  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
  });
  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down...');
    server?.close?.(() => process.exit(0));
  });
}

main();
