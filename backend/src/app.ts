import fastify from 'fastify';
import jwtPlugin from '@fastify/jwt';
import compress from '@fastify/compress';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { env } from './config/env.js';
import { connectMongoDB } from './config/mongodb.js';
import { MongoService } from './services/mongo-service.js';
import { StripeService } from './services/stripe-service.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerTeamRoutes } from './routes/team.js';
import { registerProjectRoutes } from './routes/projects.js';
import { registerBoardRoutes } from './routes/boards.js';
import { registerDocumentRoutes } from './routes/documents.js';
import { registerBootstrapRoutes } from './routes/bootstrap.js';
import { registerResourceRoutes } from './routes/resources.js';
import { registerStripeRoutes } from './routes/stripe.js';
import { registerWorkspaceRoutes } from './routes/workspaces.js';
import { registerUploadRoutes } from './routes/uploads.js';
import { createRealtimeHub } from './realtime/hub.js';
import { registerRealtimePlugin } from './plugins/realtime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const buildApp = async () => {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug'
    }
  });

  // ===== MIDDLEWARE =====
  await app.register(jwtPlugin, { secret: env.JWT_SECRET });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  await app.register(helmet);
  await app.register(compress);
  await app.register(multipart, {
    limits: {
      fileSize: 52428800, // 50MB
      fieldSize: 1000000, // 1MB
    }
  });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute'
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'TeamFlow API',
        version: '1.0.0',
        description: 'Production-ready TeamFlow backend with MongoDB'
      },
      servers: [{ url: env.FRONTEND_URL }]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs'
  });

  // ===== STATIC FILES =====
  const publicPath = path.join(__dirname, '../public');
  if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true });
  const uploadsPath = path.join(publicPath, 'uploads');
  if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

  await app.register(fastifyStatic, {
    root: publicPath,
    prefix: '/public/', // Files will be at http://localhost:PORT/public/uploads/filename
  });

  // ===== JWT DECORATOR FOR AUTHENTICATION =====
  app.decorate('authenticate', async function(request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // ===== MONGODB CONNECTION =====
  const db = await connectMongoDB();
  const mongoService = new MongoService(db);

  // ===== STRIPE SERVICE =====
  const stripeService = new StripeService();

  // ===== REALTIME HUB =====
  const realtimeHub = createRealtimeHub();
  await registerRealtimePlugin(app, realtimeHub);

  // ===== ROUTES =====
  await registerBootstrapRoutes(app, mongoService);
  await registerAuthRoutes(app, mongoService);
  await registerTeamRoutes(app, mongoService, realtimeHub);
  await registerProjectRoutes(app, mongoService, realtimeHub);
  await registerBoardRoutes(app, mongoService, realtimeHub);
  await registerDocumentRoutes(app, mongoService, realtimeHub);
  await registerResourceRoutes(app, mongoService, realtimeHub);
  await registerStripeRoutes(app, mongoService, stripeService);
  await registerWorkspaceRoutes(app, mongoService);
  await registerUploadRoutes(app, mongoService);

  // Health check
  app.get('/api/v1/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
};
