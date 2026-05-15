import type { FastifyInstance } from 'fastify';
import type { MongoService } from '../services/mongo-service.js';

export const registerBootstrapRoutes = async (fastify: FastifyInstance, mongoService: MongoService) => {
  // ===== BOOTSTRAP ENDPOINT =====
  fastify.get<{ Querystring: { workspaceId?: string; projectId?: string; channelId?: string } }>(
    '/api/v1/bootstrap',
    async (request, reply) => {
      let { workspaceId, projectId, channelId } = request.query;
      let userId = '';
      let memberId = '';

      try {
        await request.jwtVerify();
        userId = (request.user as any).id;
        memberId = (request.user as any).memberId;
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const userWorkspaces = await mongoService.getUserWorkspaces(userId, memberId);
        
        if (userWorkspaces.length === 0) {
          return reply.send({
            workspaces: [],
            projects: [],
            sprints: [],
            tasks: [],
            members: [],
            messages: [],
            documents: [],
            channels: [],
            activeWorkspaceId: '',
            activeProjectId: '',
            activeSprintId: null,
            activeView: 'board',
          });
        }

        // Use requested workspaceId or default to first one
        let activeWorkspace = workspaceId 
          ? userWorkspaces.find(w => w.id === workspaceId) 
          : userWorkspaces[0];

        // If requested workspace is not accessible, fall back to first available
        if (!activeWorkspace && workspaceId) {
          console.warn(`User ${userId} requested inaccessible workspace ${workspaceId}, falling back to first available`);
          activeWorkspace = userWorkspaces[0];
        }

        if (!activeWorkspace) {
          return reply.status(403).send({ error: 'Access denied to this workspace' });
        }

        workspaceId = activeWorkspace.id;

        // Fetch all projects in workspace
        let projects = await mongoService.getWorkspaceProjects(workspaceId);

        // Filter projects: only owner sees everything, others see where they are members
        const isOwner = activeWorkspace.ownerId === userId;
        if (!isOwner) {
          projects = projects.filter(p => p.memberIds && p.memberIds.includes(userId));
        }

        // Fetch active project data
        const firstProject = projects[0];
        let activeProjectId = projectId || (firstProject ? firstProject.id : '');
        
        // Ensure user has access to requested project
        if (projectId && !projects.find(p => p.id === projectId)) {
          activeProjectId = firstProject ? firstProject.id : '';
        }

        let sprints: any[] = [];
        let tasks: any[] = [];
        let documents: any[] = [];

        if (activeProjectId) {
          sprints = await mongoService.getProjectSprints(activeProjectId);
          tasks = await mongoService.getProjectTasks(activeProjectId);
          documents = await mongoService.getProjectDocuments(activeProjectId);
        }

        // Fetch channels and messages
        const channels = await mongoService.getWorkspaceChannels(workspaceId);
        let messages: any[] = [];
        const activeChannel = channels.find(c => c.id === channelId) || channels[0];
        if (activeChannel) {
          messages = await mongoService.getChannelMessages(activeChannel.id, 50);
        }

        const workspaceMemberIds = Array.isArray(activeWorkspace.memberIds) ? activeWorkspace.memberIds : [];

        const activeSprint = sprints.find(s => s.status === 'active');
        return reply.send({
          workspaces: userWorkspaces,
          projects,
          sprints,
          tasks,
          members: workspaceMemberIds.map((id: string) => ({ id })),
          messages,
          documents,
          channels,
          activeWorkspaceId: workspaceId,
          activeProjectId,
          activeSprintId: activeSprint ? activeSprint.id : null,
          activeView: 'board',
        });
      } catch (error: any) {
        console.error('Bootstrap error:', error?.message || error);
        return reply.status(500).send({ error: 'Failed to fetch bootstrap data' });
      }
    }
  );
};
