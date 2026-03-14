import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getDb, closeDb } from './db/connection.js';
import { runMigrations } from './db/migrations.js';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import repositoriesRouter from './routes/repositories.js';
import releasesRouter from './routes/releases.js';
import categoriesRouter from './routes/categories.js';
import configsRouter from './routes/configs.js';
import syncRouter from './routes/sync.js';
import proxyRouter from './routes/proxy.js';
import adminRouter from './routes/admin.js';
import tokensRouter from './routes/tokens.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== 'production';

export async function createApp(): Promise<express.Express> {
  const app = express();

  app.use(cors());
  app.use(morgan('combined'));
  app.use(express.json({ limit: '50mb' }));

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);

  app.use('/api', authMiddleware);

  app.use(repositoriesRouter);
  app.use(releasesRouter);
  app.use(categoriesRouter);
  app.use(configsRouter);
  app.use(syncRouter);
  app.use(tokensRouter);

  app.use(proxyRouter);

  app.use(adminRouter);

  app.use(errorHandler);

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: path.resolve(__dirname, '../..'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.bootcdn.net", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://cdn.bootcdn.net", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.github.com", "https://avatars.githubusercontent.com", "https://cdn.bootcdn.net"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  if (!isDev) {
    const frontendDistPath = path.resolve(__dirname, '../../dist');
    app.use(express.static(frontendDistPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  return app;
}

async function startServer(): Promise<void> {
  const db = getDb();
  runMigrations(db);
  console.log('✅ Database initialized');

  startScheduler();

  const app = await createApp();

  const server = app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
    if (isDev) {
      console.log('📝 Development mode: Vite integrated');
    }
  });

  const shutdown = () => {
    console.log('\n🛑 Shutting down...');
    stopScheduler();
    server.close(() => {
      closeDb();
      console.log('👋 Server stopped');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Only start server when run directly (not imported for tests)
const isMainModule = process.argv[1] && new URL(import.meta.url).pathname === new URL(`file://${process.argv[1]}`).pathname;
if (isMainModule) {
  startServer();
}
