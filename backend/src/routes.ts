import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { badRequest, HttpError } from './lib/errors.js';
import { TeamFlowService, type ResourceListFilters, type ResourceName } from './services/teamflow-service.js';

const providerSchema = z.enum(['google', 'github', 'apple']);
const providerParamsSchema = z.object({ provider: providerSchema });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

const commentSchema = z.object({
  content: z.string().min(1),
  authorId: z.string().optional()
});

const resourceFiltersSchema = z.object({
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  sprintId: z.string().optional(),
  channelId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.string().optional(),
  q: z.string().optional()
});

const resourceIdsSchema = z.object({ id: z.string().min(1) });

const oauthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  redirect_uri: z.string().optional(),
  id_token: z.string().optional(),
  user: z.string().optional()
});

const workspaceCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional()
});

const workspaceUpdateSchema = workspaceCreateSchema.partial();

const projectCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['kanban', 'scrum']),
  workspaceId: z.string().optional(),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional()
});

const projectUpdateSchema = projectCreateSchema.partial();

const sprintCreateSchema = z.object({
  name: z.string().min(1),
  projectId: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  goal: z.string().min(1)
});

const sprintUpdateSchema = sprintCreateSchema.partial();

const taskCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  sprintId: z.string().nullable().optional(),
  devNotes: z.string().optional(),
  codeSnippets: z.array(z.object({
    id: z.string(),
    language: z.string(),
    code: z.string(),
    filename: z.string()
  })).optional()
});

const taskUpdateSchema = taskCreateSchema.partial();

const memberCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'manager', 'developer', 'viewer']).optional(),
  status: z.enum(['online', 'offline', 'away']).optional()
});

const memberUpdateSchema = memberCreateSchema.partial();

const messageCreateSchema = z.object({
  content: z.string().min(1),
  senderId: z.string().optional(),
  channelId: z.string().optional()
});

const documentCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  projectId: z.string().optional(),
  linkedTaskIds: z.array(z.string()).optional(),
  authorId: z.string().optional()
});

const documentUpdateSchema = documentCreateSchema.partial();

const routeDefinitions: Record<ResourceName, { path: string; create?: z.ZodTypeAny; update?: z.ZodTypeAny }> = {
  workspaces: { path: '/workspaces', create: workspaceCreateSchema, update: workspaceUpdateSchema },
  projects: { path: '/projects', create: projectCreateSchema, update: projectUpdateSchema },
  sprints: { path: '/sprints', create: sprintCreateSchema, update: sprintUpdateSchema },
  tasks: { path: '/tasks', create: taskCreateSchema, update: taskUpdateSchema },
  members: { path: '/members', create: memberCreateSchema, update: memberUpdateSchema },
  messages: { path: '/messages', create: messageCreateSchema },
  documents: { path: '/documents', create: documentCreateSchema, update: documentUpdateSchema },
  channels: { path: '/channels' }
};

const sendValidationError = (reply: FastifyReply, error: z.ZodError) => {
  reply.code(400).send({
    error: 'bad_request',
    message: 'Validation failed',
    details: error.flatten()
  });
};

const parseOrThrow = <T>(schema: z.ZodType<T>, value: unknown) => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw badRequest('Validation failed', result.error.flatten());
  }
  return result.data;
};

const registerCrudRoutes = async (
  app: FastifyInstance,
  service: TeamFlowService,
  resource: ResourceName,
  path: string,
  createSchema?: z.ZodTypeAny,
  updateSchema?: z.ZodTypeAny
) => {
  app.get(path, async request => {
    const filters = resourceFiltersSchema.parse(request.query) as ResourceListFilters;
    return service.list(resource, filters);
  });

  if (createSchema) {
    app.post(path, async (request, reply) => {
      const body = parseOrThrow(createSchema, request.body);
      const created = await service.create(resource, body);
      reply.code(201).send(created);
    });
  }

  app.get(`${path}/:id`, async request => {
    const { id } = resourceIdsSchema.parse(request.params);
    return service.get(resource, id);
  });

  if (updateSchema) {
    app.patch(`${path}/:id`, async request => {
      const { id } = resourceIdsSchema.parse(request.params);
      const body = parseOrThrow(updateSchema, request.body);
      return service.update(resource, id, body);
    });
  }

  if (resource !== 'messages') {
    app.delete(`${path}/:id`, async request => {
      const { id } = resourceIdsSchema.parse(request.params);
      await service.remove(resource, id);
      return { ok: true };
    });
  }
};

export const registerRoutes = async (app: FastifyInstance, service: TeamFlowService) => {
  app.get('/health', async () => ({ ok: true, service: 'teamflow-backend', timestamp: new Date().toISOString() }));

  app.post('/auth/email/login', async (request, reply) => {
    const body = parseOrThrow(loginSchema, request.body);
    const result = await service.authenticateEmail(body);
    reply.send(result);
  });

  app.post('/auth/email/register', async (request, reply) => {
    const body = parseOrThrow(registerSchema, request.body);
    const result = await service.registerEmail(body);
    reply.code(201).send(result);
  });

  app.get('/oauth/:provider/start', async (request, reply) => {
    const { provider } = providerParamsSchema.parse(request.params);
    const query = z.object({ redirect_uri: z.string().url().optional() }).parse(request.query);
    const redirectUri = query.redirect_uri ?? `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/api/auth/callback/${provider}`;
    const url = await service.oauthStart(provider, redirectUri);
    reply.redirect(url);
  });

  app.all('/oauth/:provider/callback', async (request, reply) => {
    const { provider } = providerParamsSchema.parse(request.params);
    const query = parseOrThrow(oauthCallbackQuerySchema, request.method === 'GET' ? request.query : request.body) as {
      code: string | undefined;
      state: string | undefined;
      redirect_uri: string | undefined;
      id_token: string | undefined;
      user: string | undefined;
    };

    const redirectUri = query.redirect_uri ?? `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/api/auth/callback/${provider}`;
    const result = await service.oauthCallback(provider, query, redirectUri);
    reply.send(result);
  });

  app.get('/api/v1/bootstrap', async request => {
    const query = z.object({ workspaceId: z.string().optional(), projectId: z.string().optional() }).parse(request.query);
    return service.getBootstrap(query.workspaceId, query.projectId);
  });

  app.get('/api/v1/search', async request => {
    const query = z.object({ q: z.string().min(1) }).parse(request.query);
    return service.search(query.q);
  });

  app.get('/api/v1/analytics', async request => {
    const query = z.object({ projectId: z.string().optional() }).parse(request.query);
    return service.analytics(query.projectId);
  });

  for (const [resource, definition] of Object.entries(routeDefinitions) as Array<[ResourceName, (typeof routeDefinitions)[ResourceName]]>) {
    await registerCrudRoutes(app, service, resource, `/api/v1${definition.path}`, definition.create, definition.update);
  }

  app.post('/api/v1/tasks/:id/comments', async (request, reply) => {
    const { id } = resourceIdsSchema.parse(request.params);
    const body = parseOrThrow(commentSchema, request.body);
    await service.addComment(id, body.content, body.authorId);
    const task = await service.get('tasks', id);
    reply.code(201).send(task);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      reply.code(error.statusCode).send({ error: error.code, message: error.message, details: error.details ?? null });
      return;
    }

    if (error instanceof z.ZodError) {
      sendValidationError(reply, error);
      return;
    }

    request.log.error(error);
    reply.code(500).send({ error: 'internal_server_error', message: 'Something went wrong' });
  });
};
