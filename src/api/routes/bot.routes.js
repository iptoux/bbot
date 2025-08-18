import express from 'express';
import { requireApiKey } from '../../middleware/auth.js';
import { state } from '../../services/state.service.js';
import { getClient } from '../../bot/client.js';

export const botRouter = express.Router();

botRouter.get('/status', requireApiKey, (req, res) => {
  const client = getClient();
  res.json({
    enabled: state.isEnabled(),
    loggedIn: !!client?.user,
    uptimeMs: state.getUptimeMs(),
    version: state.getVersion?.(),
    guilds: client?.guilds?.cache?.size || 0,
    users: client?.users?.cache?.size || 0
  });
});

botRouter.post('/enable', requireApiKey, (req, res) => {
  res.json({ enabled: state.enable() });
});

botRouter.post('/disable', requireApiKey, (req, res) => {
  res.json({ enabled: state.disable() });
});

botRouter.post('/restart', requireApiKey, async (req, res) => {
  const mode = (req.body?.mode || '').toLowerCase();
  const result = await state.restart(mode || undefined, getClient());
  res.status(result?.ok ? 202 : 400).json(result);
});
