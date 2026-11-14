import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import type {
  CampaignRecord,
  CareerProfile,
  DestinationId,
  PlanetaryBaseModule,
} from './src/engine/types';
import { handleAICommanderQuery, type AICommanderRequestBody } from './server/aiCommander';
import { fetchNasaHorizonsEphemeris } from './server/horizonsProxy';
import { registerMultiplayerHandlers } from './server/multiplayer';
import {
  addCampaignRecord,
  getCampaignData,
  saveBaseModulesRemote,
  saveCareerProfileRemote,
} from './server/persistence';

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
    path: '/socket.io',
  });

  registerMultiplayerHandlers(io);

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Orbital Command Mission Server',
      multiplayerEnabled: true,
      aiCommanderReady: true,
      timestamp: new Date().toISOString(),
    });
  });

  // NASA/JPL Horizons Ephemeris Proxy
  app.get('/api/nasa/horizons', async (req, res) => {
    const target = (req.query.target as DestinationId) || 'mars';
    const data = await fetchNasaHorizonsEphemeris(target);
    res.json(data);
  });

  // Campaign, Base Modules & Career persistence API
  app.get('/api/campaigns', (_req, res) => {
    res.json(getCampaignData());
  });

  app.post('/api/campaigns', (req, res) => {
    const { record, achievements } = req.body as {
      record?: CampaignRecord;
      achievements?: string[];
    };
    if (!record || !record.id || !record.missionName) {
      res.status(400).json({ error: 'Invalid campaign record payload.' });
      return;
    }
    const updated = addCampaignRecord(record, Array.isArray(achievements) ? achievements : []);
    res.json(updated);
  });

  app.post('/api/base-modules', (req, res) => {
    const { modules } = req.body as { modules?: PlanetaryBaseModule[] };
    if (!Array.isArray(modules)) {
      res.status(400).json({ error: 'Invalid base modules array.' });
      return;
    }
    const saved = saveBaseModulesRemote(modules);
    res.json({ baseModules: saved });
  });

  app.post('/api/career', (req, res) => {
    const { career } = req.body as { career?: CareerProfile };
    if (!career || typeof career.xp !== 'number') {
      res.status(400).json({ error: 'Invalid career profile payload.' });
      return;
    }
    const saved = saveCareerProfileRemote(career);
    res.json({ career: saved });
  });

  // Server-side AI Mission Commander (Gemini + Flight Director Fallback)
  app.post('/api/ai/commander', async (req, res) => {
    const body = req.body as AICommanderRequestBody;
    if (!body?.mission || typeof body.question !== 'string') {
      res.status(400).json({ error: 'Missing mission or question payload.' });
      return;
    }
    const reply = await handleAICommanderQuery(body);
    res.json(reply);
  });

  // Vite dev middleware or production static assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Orbital Command] Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Orbital Command] Failed to start server:', err);
  process.exit(1);
});
