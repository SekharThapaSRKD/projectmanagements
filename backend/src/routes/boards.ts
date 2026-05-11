import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { MongoService } from '../services/mongo-service.js';
import type { Board, BoardColumn } from '../types/models.js';
import type { RealtimeHub } from '../realtime/hub.js';

const boardColumnSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Column name is required'),
  color: z.string().optional(),
});

const boardCreateSchema = z.object({
  name: z.string().min(1, 'Board name is required'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Project ID is required'),
  columns: z.array(boardColumnSchema).min(1, 'At least one column is required'),
  visibility: z.enum(['private', 'team', 'public']).default('team'),
  tags: z.array(z.string()).optional(),
});

const boardUpdateSchema = boardCreateSchema.partial().omit({ projectId: true });

export const registerBoardRoutes = async (fastify: FastifyInstance, mongoService: MongoService, realtimeHub: RealtimeHub) => {
  // ===== GET ALL BOARDS IN PROJECT =====
  fastify.get<{ Querystring: { projectId?: string; workspaceId?: string } }>(
    '/api/v1/boards',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { projectId, workspaceId } = request.query;

      if (!projectId && !workspaceId) {
        return reply.status(400).send({ error: 'projectId or workspaceId is required' });
      }

      try {
        let boards: Board[] = [];
        if (projectId) {
          boards = await mongoService.getBoardsByProject(projectId);
        } else if (workspaceId) {
          boards = await mongoService.getBoardsByWorkspace(workspaceId);
        }
        return reply.send(boards);
      } catch (error) {
        console.error('Get boards error:', error);
        return reply.status(500).send({ error: 'Failed to fetch boards' });
      }
    }
  );

  // ===== GET SINGLE BOARD =====
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/boards/:id',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const board = await mongoService.getBoard(id);
        if (!board) {
          return reply.status(404).send({ error: 'Board not found' });
        }
        return reply.send(board);
      } catch (error) {
        console.error('Get board error:', error);
        return reply.status(500).send({ error: 'Failed to fetch board' });
      }
    }
  );

  // ===== CREATE BOARD =====
  fastify.post<{ Body: z.infer<typeof boardCreateSchema> }>(
    '/api/v1/boards',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const validation = boardCreateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.error.flatten()
        });
      }

      const { name, description, projectId, columns, visibility, tags } = validation.data;
      const userId = (request.user as any).id;

      try {
        // Verify project exists
        const project = await mongoService.getProject(projectId);
        if (!project) {
          return reply.status(404).send({ error: 'Project not found' });
        }

        const boardId = `board_${nanoid(12)}`;
        const now = new Date();

        // Create columns with IDs
        const boardColumns: BoardColumn[] = columns.map(col => ({
          id: col.id || `col_${nanoid(8)}`,
          name: col.name,
          ...(col.color ? { color: col.color } : {})
        }));

        const board: Board = {
          id: boardId,
          name,
          description: description || '',
          projectId,
          workspaceId: project.workspaceId,
          columns: boardColumns,
          createdBy: userId,
          visibility: visibility || 'team',
          tags: tags || [],
          createdAt: now,
          updatedAt: now,
        };

        const created = await mongoService.createBoard(board);
        realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
        return reply.status(201).send(created);
      } catch (error) {
        console.error('Create board error:', error);
        return reply.status(500).send({ error: 'Failed to create board' });
      }
    }
  );

  // ===== UPDATE BOARD =====
  fastify.patch<{ Params: { id: string }; Body: z.infer<typeof boardUpdateSchema> }>(
    '/api/v1/boards/:id',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user as any).id;

      const validation = boardUpdateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.error.flatten()
        });
      }

      try {
        const board = await mongoService.getBoard(id);
        if (!board) {
          return reply.status(404).send({ error: 'Board not found' });
        }

        // Only creator can update the board
        if (board.createdBy !== userId) {
          return reply.status(403).send({ error: 'You do not have permission to update this board' });
        }

        const updates: Partial<Board> = {
          updatedAt: new Date(),
          ...(validation.data.name !== undefined ? { name: validation.data.name } : {}),
          ...(validation.data.description !== undefined ? { description: validation.data.description } : {}),
          ...(validation.data.visibility !== undefined ? { visibility: validation.data.visibility } : {}),
          ...(validation.data.tags !== undefined ? { tags: validation.data.tags } : {}),
          ...(validation.data.columns !== undefined
            ? {
                columns: validation.data.columns.map(col => ({
                  id: col.id || `col_${nanoid(8)}`,
                  name: col.name,
                  ...(col.color ? { color: col.color } : {})
                }))
              }
            : {})
        };

        const updated = await mongoService.updateBoard(id, updates);
        realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
        return reply.send(updated);
      } catch (error) {
        console.error('Update board error:', error);
        return reply.status(500).send({ error: 'Failed to update board' });
      }
    }
  );

  // ===== DELETE BOARD =====
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/boards/:id',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user as any).id;

      try {
        const board = await mongoService.getBoard(id);
        if (!board) {
          return reply.status(404).send({ error: 'Board not found' });
        }

        // Only creator can delete the board
        if (board.createdBy !== userId) {
          return reply.status(403).send({ error: 'You do not have permission to delete this board' });
        }

        await mongoService.deleteBoard(id);
        realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
        return reply.send({ success: true });
      } catch (error) {
        console.error('Delete board error:', error);
        return reply.status(500).send({ error: 'Failed to delete board' });
      }
    }
  );
};
