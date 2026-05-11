import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { MongoService } from '../services/mongo-service.js';
import type { Workspace } from '../types/models.js';
import { getUserPlanLimits } from '../config/pricing.js';

const workspaceCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const registerWorkspaceRoutes = async (fastify: FastifyInstance, mongoService: MongoService) => {
  fastify.post<{ Body: z.infer<typeof workspaceCreateSchema> }>(
    '/api/v1/workspaces',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const validation = workspaceCreateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Validation failed', details: validation.error.flatten() });
      }

      const { name, description } = validation.data;
      const userId = (request.user as any).id;
      const memberId = (request.user as any).memberId;

      try {
        // Check limits
        const subscription = await mongoService.getSubscriptionByAccountId(userId);
        const userPlan = subscription?.plan || 'free';
        const limits = getUserPlanLimits(userPlan);

        // Get count of owned workspaces
        const ownedWorkspaces = await mongoService.getOwnedWorkspaces(userId);
        
        if (ownedWorkspaces.length >= limits.workspaces) {
          return reply.status(403).send({
            error: `Workspace limit reached for ${userPlan} plan`,
            limit: limits.workspaces,
            current: ownedWorkspaces.length,
            message: `Upgrade to create more workspaces. Current limit: ${limits.workspaces}`
          });
        }

        const workspace: Workspace = {
          id: `ws_${nanoid(12)}`,
          name,
          description: description || '',
          ownerId: userId,
          memberIds: [memberId],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const created = await mongoService.createWorkspace(workspace);
        return reply.status(201).send(created);
      } catch (error) {
        console.error('Create workspace error:', error);
        return reply.status(500).send({ error: 'Failed to create workspace' });
      }
    }
  );
};
