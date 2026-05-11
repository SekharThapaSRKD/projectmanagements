import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { MongoService } from '../services/mongo-service.js';
import type { Task, Message, Channel, Sprint } from '../types/models.js';
import type { RealtimeHub } from '../realtime/hub.js';

const taskCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  projectId: z.string().min(1),
  sprintId: z.string().nullable().optional(),
});

const messageCreateSchema = z.object({
  content: z.string().min(1),
  channelId: z.string().min(1),
  senderId: z.string().optional(),
});

const channelCreateSchema = z.object({
  name: z.string().min(1),
  workspaceId: z.string().min(1),
  type: z.enum(['workspace', 'project']).optional(),
});

const sprintCreateSchema = z.object({
  name: z.string().min(1),
  projectId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  goal: z.string().optional(),
});

export const registerResourceRoutes = async (fastify: FastifyInstance, mongoService: MongoService, realtimeHub: RealtimeHub) => {
  // ===== TASKS =====
  fastify.get<{ Querystring: { projectId?: string } }>(
    '/api/v1/tasks',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { projectId } = request.query;
      if (!projectId) {
        return reply.status(400).send({ error: 'projectId is required' });
      }
      const tasks = await mongoService.getProjectTasks(projectId);
      return reply.send(tasks);
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/tasks/:id',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const task = await mongoService.getTask(id);
      if (!task) return reply.status(404).send({ error: 'Task not found' });
      return reply.send(task);
    }
  );

  fastify.post<{ Body: z.infer<typeof taskCreateSchema> }>(
    '/api/v1/tasks',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const validation = taskCreateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Validation failed', details: validation.error.flatten() });
      }

      const { title, projectId, ...rest } = validation.data;
      const taskId = `task_${nanoid(12)}`;
      const now = new Date();

      const task: Task = {
        id: taskId,
        projectId,
        title,
        description: rest.description || '',
        status: rest.status || 'todo',
        priority: rest.priority || 'medium',
        assigneeId: rest.assigneeId || null,
        labels: rest.labels || [],
        sprintId: rest.sprintId || null,
        comments: [],
        createdAt: now,
        updatedAt: now,
      };

      const created = await mongoService.createTask(task);
      realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
      return reply.status(201).send(created);
    }
  );

  fastify.patch<{ Params: { id: string }; Body: Partial<Task> }>(
    '/api/v1/tasks/:id',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const task = await mongoService.getTask(id);
      if (!task) return reply.status(404).send({ error: 'Task not found' });

      await mongoService.updateTask(id, request.body);
      const updated = await mongoService.getTask(id);
      realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
      return reply.send(updated);
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/tasks/:id',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      await mongoService.deleteTask(id);
      realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
      return reply.send({ success: true });
    }
  );

  // ===== MESSAGES =====
  fastify.get<{ Querystring: { channelId: string } }>(
    '/api/v1/messages',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { channelId } = request.query;
      if (!channelId) {
        return reply.status(400).send({ error: 'channelId is required' });
      }
      const messages = await mongoService.getChannelMessages(channelId);
      return reply.send(messages);
    }
  );

  fastify.post<{ Body: z.infer<typeof messageCreateSchema> }>(
    '/api/v1/messages',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const validation = messageCreateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Validation failed', details: validation.error.flatten() });
      }

      const { content, channelId, senderId } = validation.data;
      const messageId = `msg_${nanoid(12)}`;
      const now = new Date();

      const message: Message = {
        id: messageId,
        channelId,
        senderId: senderId || 'system',
        content,
        attachments: [],
        createdAt: now,
        updatedAt: now,
      };

      const created = await mongoService.createMessage(message);
      realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
      return reply.status(201).send(created);
    }
  );

  // ===== CHANNELS =====
  fastify.get<{ Querystring: { workspaceId?: string } }>(
    '/api/v1/channels',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { workspaceId } = request.query;
      if (!workspaceId) {
        return reply.status(400).send({ error: 'workspaceId is required' });
      }
      const channels = await mongoService.getWorkspaceChannels(workspaceId);
      return reply.send(channels);
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/channels/:id',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const channel = await mongoService.getChannel(id);
      if (!channel) return reply.status(404).send({ error: 'Channel not found' });
      return reply.send(channel);
    }
  );

  fastify.post<{ Body: z.infer<typeof channelCreateSchema> }>(
    '/api/v1/channels',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const validation = channelCreateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Validation failed', details: validation.error.flatten() });
      }

      const { name, workspaceId, type } = validation.data;
      const channelId = `chan_${nanoid(12)}`;
      const now = new Date();

      const channel: Channel = {
        id: channelId,
        name,
        workspaceId,
        type: type || 'workspace',
        memberIds: [],
        createdAt: now,
        updatedAt: now,
      };

      const created = await mongoService.createChannel(channel);
      realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
      return reply.status(201).send(created);
    }
  );

  // ===== SPRINTS =====
  fastify.get<{ Querystring: { projectId?: string } }>(
    '/api/v1/sprints',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { projectId } = request.query;
      if (!projectId) {
        return reply.status(400).send({ error: 'projectId is required' });
      }
      const sprints = await mongoService.getProjectSprints(projectId);
      return reply.send(sprints);
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/sprints/:id',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const sprint = await mongoService.getSprint(id);
      if (!sprint) return reply.status(404).send({ error: 'Sprint not found' });
      return reply.send(sprint);
    }
  );

  fastify.post<{ Body: z.infer<typeof sprintCreateSchema> }>(
    '/api/v1/sprints',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const validation = sprintCreateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Validation failed', details: validation.error.flatten() });
      }

      const { name, projectId, startDate, endDate, goal } = validation.data;
      const sprintId = `sprint_${nanoid(12)}`;
      const now = new Date();

      const sprint: Sprint = {
        id: sprintId,
        projectId,
        name,
        status: 'planning',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        goal: goal || '',
        taskIds: [],
        createdAt: now,
        updatedAt: now,
      };

      const created = await mongoService.createSprint(sprint);
      realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
      return reply.status(201).send(created);
    }
  );

  fastify.patch<{ Params: { id: string }; Body: Partial<Sprint> }>(
    '/api/v1/sprints/:id',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const sprint = await mongoService.getSprint(id);
      if (!sprint) return reply.status(404).send({ error: 'Sprint not found' });

      await mongoService.updateSprint(id, request.body);
      const updated = await mongoService.getSprint(id);
      realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
      return reply.send(updated);
    }
  );
};
