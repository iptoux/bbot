import express from 'express';
import cors from 'cors';
import { config } from '../config/index.js';
import { botRouter } from './routes/bot.routes.js';
import { statsRouter } from './routes/stats.routes.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ ok: true, version: config.VERSION }));

  app.use('/bot', botRouter);
  app.use('/stats', statsRouter);

  // 404 handler
  app.use((req, res) => res.status(404).json({ error: 'not found' }));

  return app;
}

export function startServer(port = config.PORT) {
  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`[api] listening on port ${port}`);
  });
  return { app, server };
}
