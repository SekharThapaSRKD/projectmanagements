import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { MongoService } from '../services/mongo-service.js';
import { RealtimeHub } from '../realtime/hub.js';
import type { Document, DocumentFile } from '../types/models.js';

const createDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional().default(''),
  projectId: z.string(),
});

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
});

type CreateDocumentBody = z.infer<typeof createDocumentSchema>;
type UpdateDocumentBody = z.infer<typeof updateDocumentSchema>;

export async function registerDocumentRoutes(
  app: FastifyInstance,
  mongoService: MongoService,
  realtimeHub: RealtimeHub
) {
  // Create document
  app.post<{ Body: CreateDocumentBody }>(
    '/api/v1/documents',
    { onRequest: [(app as any).authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      const result = createDocumentSchema.safeParse(request.body);
      if (!result.success) return reply.code(400).send({ error: result.error });

      const { title, content, projectId } = result.data;
      const documentId = nanoid();

      const document: Document = {
        id: documentId,
        title,
        content,
        projectId,
        files: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await mongoService.createDocument(document);
      realtimeHub.broadcast({ type: 'document:created', data: saved });
      return reply.code(201).send(saved);
    }
  );

  // Get documents by project
  app.get<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/documents',
    { onRequest: [(app as any).authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const documents = await mongoService.getProjectDocuments(projectId);
      return reply.send(documents);
    }
  );

  // Get single document
  app.get<{ Params: { documentId: string } }>(
    '/api/v1/documents/:documentId',
    { onRequest: [(app as any).authenticate] },
    async (request, reply) => {
      const { documentId } = request.params;
      const document = await mongoService.getDocument(documentId);
      if (!document) return reply.code(404).send({ error: 'Document not found' });
      return reply.send(document);
    }
  );

  // Update document
  app.patch<{ Params: { documentId: string }; Body: UpdateDocumentBody }>(
    '/api/v1/documents/:documentId',
    { onRequest: [(app as any).authenticate] },
    async (request, reply) => {
      const { documentId } = request.params;
      const result = updateDocumentSchema.safeParse(request.body);
      if (!result.success) return reply.code(400).send({ error: result.error });

      const document = await mongoService.getDocument(documentId);
      if (!document) return reply.code(404).send({ error: 'Document not found' });

      const updatePayload: Partial<Document> = {
        updatedAt: new Date(),
        ...(result.data.title !== undefined ? { title: result.data.title } : {}),
        ...(result.data.content !== undefined ? { content: result.data.content } : {}),
      };

      const updated = await mongoService.updateDocument(documentId, updatePayload);

      realtimeHub.broadcast({ type: 'document:updated', data: updated });
      return reply.send(updated);
    }
  );

  // Delete document
  app.delete<{ Params: { documentId: string } }>(
    '/api/v1/documents/:documentId',
    { onRequest: [(app as any).authenticate] },
    async (request, reply) => {
      const { documentId } = request.params;
      const document = await mongoService.getDocument(documentId);
      if (!document) return reply.code(404).send({ error: 'Document not found' });

      await mongoService.deleteDocument(documentId);
      realtimeHub.broadcast({ type: 'document:deleted', data: { id: documentId } });
      return reply.send({ success: true });
    }
  );

  // Upload file to document
  app.post<{ Params: { documentId: string } }>(
    '/api/v1/documents/:documentId/files',
    { onRequest: [(app as any).authenticate] },
    async (request, reply) => {
      const { documentId } = request.params;
      const userId = (request.user as any).id;

      const data = await request.file();
      if (!data) return reply.code(400).send({ error: 'No file provided' });

      const document = await mongoService.getDocument(documentId);
      if (!document) return reply.code(404).send({ error: 'Document not found' });

      const buffer = await data.toBuffer();
      const fileId = nanoid();
      const documentFile: DocumentFile = {
        id: fileId,
        name: data.filename,
        url: `/api/v1/documents/${documentId}/files/${fileId}/download`,
        size: buffer.length,
        mimeType: data.mimetype,
        uploadedAt: new Date(),
        uploadedBy: userId,
      };

      const fileWithData = {
        ...documentFile,
        data: buffer.toString('base64'),
      };

      const files = [...(document.files || []), documentFile];
      await mongoService.updateDocument(documentId, {
        files,
        updatedAt: new Date(),
      });

      await mongoService.storeDocumentFile(documentId, fileWithData);
      realtimeHub.broadcast({ type: 'document:fileAdded', data: { documentId, file: documentFile } });
      return reply.code(201).send(documentFile);
    }
  );

  // Download file from document
  app.get<{ Params: { documentId: string; fileId: string } }>(
    '/api/v1/documents/:documentId/files/:fileId/download',
    { onRequest: [(app as any).authenticate] },
    async (request, reply) => {
      const { documentId, fileId } = request.params;
      const document = await mongoService.getDocument(documentId);
      if (!document) return reply.code(404).send({ error: 'Document not found' });

      const file = document.files?.find(f => f.id === fileId);
      if (!file) return reply.code(404).send({ error: 'File not found' });

      const fileData = await mongoService.getDocumentFile(documentId, fileId);
      if (!fileData) return reply.code(404).send({ error: 'File data not found' });

      const buffer = Buffer.from(fileData.data, 'base64');
      reply.type(file.mimeType);
      reply.header('Content-Disposition', `attachment; filename="${file.name}"`);
      return reply.send(buffer);
    }
  );

  // Delete file from document
  app.delete<{ Params: { documentId: string; fileId: string } }>(
    '/api/v1/documents/:documentId/files/:fileId',
    { onRequest: [(app as any).authenticate] },
    async (request, reply) => {
      const { documentId, fileId } = request.params;
      const document = await mongoService.getDocument(documentId);
      if (!document) return reply.code(404).send({ error: 'Document not found' });

      const files = (document.files || []).filter(f => f.id !== fileId);
      await mongoService.updateDocument(documentId, {
        files,
        updatedAt: new Date(),
      });

      await mongoService.deleteDocumentFile(documentId, fileId);
      realtimeHub.broadcast({ type: 'document:fileRemoved', data: { documentId, fileId } });
      return reply.send({ success: true });
    }
  );
}
