import type { FastifyInstance } from 'fastify';
import type { RealtimeHub } from '../realtime/hub.js';
import { env } from '../config/env.js';

export const registerRealtimePlugin = async (app: FastifyInstance, hub: RealtimeHub) => {
  app.get('/api/v1/realtime/events', async (_request, reply) => {
    // Set CORS headers explicitly for SSE
    reply.raw.setHeader('Access-Control-Allow-Origin', env.CORS_ORIGIN);
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders?.();

    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ ok: true, subscribers: hub.size() })}\n\n`);

    const unsubscribe = hub.subscribe(event => {
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });

    const heartbeat = setInterval(() => {
      reply.raw.write(': keep-alive\n\n');
    }, 30000);

    reply.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });

    return reply;
  });
};