import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { MongoService } from '../services/mongo-service.js';
import type { Project } from '../types/models.js';
import type { RealtimeHub } from '../realtime/hub.js';
import { getUserPlanLimits } from '../config/pricing.js';

const projectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  type: z.enum(['kanban', 'scrum']),
  description: z.string().optional(),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
});

const projectUpdateSchema = projectCreateSchema.partial();

export const registerProjectRoutes = async (fastify: FastifyInstance, mongoService: MongoService, realtimeHub: RealtimeHub) => {
  // ===== GET ALL PROJECTS IN WORKSPACE =====
  fastify.get<{ Querystring: { workspaceId?: string } }>(
    '/api/v1/projects',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { workspaceId } = request.query;

      if (!workspaceId) {
        return reply.status(400).send({ error: 'workspaceId is required' });
      }

      try {
        const userId = (request.user as any).id;
        const workspace = await mongoService.getWorkspace(workspaceId);
        
        if (!workspace) {
          return reply.status(404).send({ error: 'Workspace not found' });
        }

        // Check if user is owner or admin of the workspace
        // For simplicity, we check if they are the ownerId.
        const isOwner = workspace.ownerId === userId;
        
        let projects = await mongoService.getWorkspaceProjects(workspaceId);
        
        if (!isOwner) {
          // If not owner, only show projects they are a member of
          projects = projects.filter(p => p.memberIds && p.memberIds.includes(userId));
        }

        return reply.send(projects);
      } catch (error) {
        console.error('Get projects error:', error);
        return reply.status(500).send({ error: 'Failed to fetch projects' });
      }
    }
  );

  // ===== GET SINGLE PROJECT =====
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/projects/:id',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const project = await mongoService.getProject(id);
        if (!project) {
          return reply.status(404).send({ error: 'Project not found' });
        }
        return reply.send(project);
      } catch (error) {
        console.error('Get project error:', error);
        return reply.status(500).send({ error: 'Failed to fetch project' });
      }
    }
  );

  // ===== CREATE PROJECT =====
  fastify.post<{ Body: z.infer<typeof projectCreateSchema> }>(
    '/api/v1/projects',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const validation = projectCreateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.error.flatten()
        });
      }

      const { name, type, description, workspaceId } = validation.data;

      try {
        // Verify workspace exists and user has access
        const workspace = await mongoService.getWorkspace(workspaceId);
        if (!workspace) {
          return reply.status(404).send({ error: 'Workspace not found' });
        }

        // Get user account for subscription check
        const userId = (request.user as any).id;
        const userAccount = await mongoService.findAccountById(userId);
        if (!userAccount) {
          return reply.status(401).send({ error: 'User not found' });
        }

        // Check project limit for this workspace
        const workspaceProjects = await mongoService.getWorkspaceProjects(workspaceId);
        const subscription = await mongoService.getSubscriptionByAccountId(userId);
        const userPlan = subscription?.plan || 'free';
        const limits = getUserPlanLimits(userPlan);

        if (workspaceProjects.length >= limits.projectsPerWorkspace) {
          return reply.status(403).send({
            error: `Project limit reached for ${userPlan} plan`,
            limit: limits.projectsPerWorkspace,
            current: workspaceProjects.length,
            message: `Upgrade to create more projects. Current limit: ${limits.projectsPerWorkspace}`,
          });
        }

        const projectId = `proj_${nanoid(12)}`;
        const now = new Date();

        // Create default columns based on project type
        const columns = type === 'scrum' 
          ? [
              { id: 'backlog', title: 'Backlog' },
              { id: 'sprint', title: 'Sprint' },
              { id: 'in_progress', title: 'In Progress' },
              { id: 'in_review', title: 'In Review' },
              { id: 'done', title: 'Done' }
            ]
          : [
              { id: 'todo', title: 'To Do' },
              { id: 'in_progress', title: 'In Progress' },
              { id: 'in_review', title: 'In Review' },
              { id: 'done', title: 'Done' }
            ];

        const project: Project = {
          id: projectId,
          name,
          key: name.substring(0, 3).toUpperCase() + '-' + Math.random().toString(36).substring(7),
          type,
          description: description || '',
          workspaceId,
          memberIds: [userId],
          columns,
          createdAt: now,
          updatedAt: now,
        };

        const created = await mongoService.createProject(project);
        realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
        return reply.status(201).send(created);
      } catch (error) {
        console.error('Create project error:', error);
        return reply.status(500).send({ error: 'Failed to create project' });
      }
    }
  );

  // ===== UPDATE PROJECT =====
  fastify.patch<{ Params: { id: string }; Body: z.infer<typeof projectUpdateSchema> }>(
    '/api/v1/projects/:id',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      
      const validation = projectUpdateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.error.flatten()
        });
      }

      try {
        const project = await mongoService.getProject(id);
        if (!project) {
          return reply.status(404).send({ error: 'Project not found' });
        }

        const data = validation.data as any;
        const updated: any = {
          updatedAt: new Date(),
        };
        
        if (data.name !== undefined) updated.name = data.name;
        if (data.type !== undefined) updated.type = data.type;
        if (data.description !== undefined) updated.description = data.description;
        if (data.workspaceId !== undefined) updated.workspaceId = data.workspaceId;

        const result = await mongoService.updateProject(id, updated);
        realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
        return reply.send(result || project);
      } catch (error) {
        console.error('Update project error:', error);
        return reply.status(500).send({ error: 'Failed to update project' });
      }
    }
  );

  // ===== DELETE PROJECT =====
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/projects/:id',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const project = await mongoService.getProject(id);
        if (!project) {
          return reply.status(404).send({ error: 'Project not found' });
        }

        await mongoService.deleteProject(id);
        realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
        return reply.send({ success: true });
      } catch (error) {
        console.error('Delete project error:', error);
        return reply.status(500).send({ error: 'Failed to delete project' });
      }
    }
  );
};
