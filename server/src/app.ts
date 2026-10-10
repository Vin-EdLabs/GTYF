import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import type { Env } from './env';
import { errorHandler, notFound } from './lib/http';
import { publicRouter } from './routes/public';
import { contentRouter } from './routes/content';
import { formsRouter } from './routes/forms';
import { donationsRouter } from './routes/donations';
import { paystackWebhook } from './routes/webhook';
import { adminRouter } from './routes/admin';
import { adminContentRouter } from './routes/adminContent';
import { adminInboxRouter } from './routes/adminInbox';

export function createApp(env: Env, opts: { onDevShutdown?: () => void } = {}) {
  const app = express();

  // Development only: stop the server cleanly (so the local database is closed
  // properly) with `curl -X POST localhost:4000/api/__dev/shutdown`. Never in production,
  // and only from this computer.
  if (env.NODE_ENV !== 'production' && opts.onDevShutdown) {
    app.post('/api/__dev/shutdown', (req, res) => {
      const ip = req.socket.remoteAddress ?? '';
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) {
        res.status(403).json({ error: 'Local only' });
        return;
      }
      res.json({ ok: true });
      opts.onDevShutdown!();
    });
  }

  // Behind Nginx on the same machine. Nginx resolves the visitor's real IP
  // (including behind Cloudflare, via real_ip) and passes it in X-Forwarded-For,
  // so trusting only the local proxy gives rate limits the true client address.
  app.set('trust proxy', env.NODE_ENV === 'production' ? 'loopback' : false);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: env.SITE_URL, credentials: true }));

  // Paystack webhook: mounted BEFORE the JSON parser so the signature is
  // verified against the exact raw bytes Paystack sent.
  app.post('/api/paystack/webhook', express.raw({ type: 'application/json', limit: '1mb' }), paystackWebhook);

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Uploaded images. In production Nginx serves /uploads directly; this is for development.
  app.use(
    '/uploads',
    express.static(path.resolve(env.UPLOAD_DIR), { maxAge: '365d', immutable: true, fallthrough: false }),
  );

  app.use('/api', publicRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/forms', formsRouter);
  app.use('/api/donations', donationsRouter);
  app.use('/api/admin/content', adminContentRouter);
  app.use('/api/admin/inbox', adminInboxRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}
