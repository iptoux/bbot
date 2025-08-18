import express from 'express';
import { requireApiKey } from '../../middleware/auth.js';
import { stats } from '../../services/stats.service.js';

export const statsRouter = express.Router();

statsRouter.get('/', requireApiKey, (req, res) => {
  const overview = stats.getOverview();
  res.json(overview);
});

statsRouter.get('/messages', requireApiKey, (req, res) => {
  const { from, to, channelId, userId } = req.query;
  const result = stats.getMessages({ from, to, channelId, userId });
  res.json(result);
});

statsRouter.get('/users', requireApiKey, (req, res) => {
  const top = parseInt(req.query.top ?? '10', 10);
  res.json(stats.getUsers({ top: Number.isFinite(top) ? top : 10 }));
});

statsRouter.get('/jokes', requireApiKey, (req, res) => {
  const top = parseInt(req.query.top ?? '10', 10);
  res.json(stats.getJokes({ top: Number.isFinite(top) ? top : 10 }));
});

statsRouter.get('/commands', requireApiKey, (req, res) => {
  const top = parseInt(req.query.top ?? '20', 10);
  res.json(stats.getCommands({ top: Number.isFinite(top) ? top : 20 }));
});
