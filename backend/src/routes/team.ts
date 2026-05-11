import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { MongoService } from '../services/mongo-service.js';
import type { Invitation } from '../types/models.js';
import type { RealtimeHub } from '../realtime/hub.js';
import { mailService } from '../services/mail-service.js';

export const registerTeamRoutes = async (fastify: FastifyInstance, mongoService: MongoService, realtimeHub: RealtimeHub) => {
  // ===== INVITE USER =====
  fastify.post<{ Body: { workspaceId: string; email: string; role: string; projectId?: string } }>(
    '/api/v1/team/invite',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { workspaceId, email, role, projectId } = request.body;
      const userId = (request.user as any).id;
      const memberId = (request.user as any).memberId;
      const normalizedEmail = email.trim().toLowerCase();

      // Allow workspace owner and existing workspace members to invite.
      const workspace = await mongoService.getWorkspace(workspaceId);
      const workspaceMemberIds = workspace?.memberIds || [];
      const canInvite = Boolean(workspace && (workspace.ownerId === userId || (memberId && workspaceMemberIds.includes(memberId))));
      if (!canInvite) {
        return reply.status(403).send({ error: 'Not authorized to invite members' });
      }

      if (projectId) {
        const project = await mongoService.getProject(projectId);
        if (!project || project.workspaceId !== workspaceId) {
          return reply.status(400).send({ error: 'Invalid project for this workspace' });
        }
      }

      // Check if user already member
      const existingAccount = await mongoService.findAccountByEmail(normalizedEmail);
      if (existingAccount && workspaceMemberIds.includes(existingAccount.memberId)) {
        return reply.status(409).send({ error: 'User already a member' });
      }

      // Check if invitation already exists
      const pendingInvitations = await mongoService.getPendingInvitations(workspaceId);
      if (pendingInvitations.some(inv => inv.email.toLowerCase() === normalizedEmail)) {
        return reply.status(409).send({ error: 'Invitation already sent' });
      }

      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const invitation: Invitation = {
        id: `inv_${nanoid(12)}`,
        workspaceId,
        email: normalizedEmail,
        invitedBy: userId,
        token,
        expiresAt,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(projectId ? { projectId } : {}),
      };

      await mongoService.createInvitation(invitation);

      const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${token}`;
      
      const inviteMsg = projectId ? 'collaborate on a project in TeamFlow' : 'join a workspace in TeamFlow';
      try {
        await mailService.sendEmail(
          normalizedEmail,
          'You have been invited to TeamFlow!',
          `<p>You have been invited to ${inviteMsg}.</p>
           <p>Click the link below to accept the invitation:</p>
           <a href="${invitationUrl}">${invitationUrl}</a>`
        );
      } catch (error: any) {
        await mongoService.deleteInvitationById(invitation.id);
        return reply.status(502).send({
          error: 'Failed to deliver invitation email',
          details: error?.message || 'Email provider rejected the request'
        });
      }

      return reply.send({
        success: true,
        message: `Invitation sent to ${normalizedEmail}`,
        invitationUrl,
      });
    }
  );

  // ===== ACCEPT INVITATION =====
  fastify.post<{ Body: { token: string } }>(
    '/api/v1/team/accept-invitation',
    async (request, reply) => {
      const { token } = request.body;

      const invitation = await mongoService.findInvitation(token);
      if (!invitation) {
        return reply.status(404).send({ error: 'Invitation not found or expired' });
      }

      if (invitation.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Invitation expired' });
      }

      if (invitation.status !== 'pending') {
        return reply.status(400).send({ error: 'Invitation already processed' });
      }

      // Accept invitation
      await mongoService.acceptInvitation(token);

      // Add user to workspace
      const account = await mongoService.findAccountByEmail(invitation.email);
      if (account) {
        await mongoService.addMemberToWorkspace(invitation.workspaceId, account.memberId);
        
        if (invitation.projectId) {
          await mongoService.addMemberToProject(invitation.projectId, account.memberId);
        }
        
        realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });
      }

      return reply.send({
        success: true,
        message: 'Invitation accepted',
        workspaceId: invitation.workspaceId,
      });
    }
  );

  // ===== GET WORKSPACE MEMBERS =====
  fastify.get<{ Params: { workspaceId: string } }>(
    '/api/v1/team/members/:workspaceId',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { workspaceId } = request.params;

      const workspace = await mongoService.getWorkspace(workspaceId);
      if (!workspace) {
        return reply.status(404).send({ error: 'Workspace not found' });
      }

      return reply.send({
        members: workspace.memberIds || [],
      });
    }
  );

  // ===== REMOVE MEMBER =====
  fastify.delete<{ Params: { workspaceId: string }; Body: { memberId: string } }>(
    '/api/v1/team/members/:workspaceId',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { workspaceId } = request.params;
      const { memberId } = request.body;
      const userId = (request.user as any).id;

      const workspace = await mongoService.getWorkspace(workspaceId);
      if (!workspace || workspace.ownerId !== userId) {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      await mongoService.removeMemberFromWorkspace(workspaceId, memberId);
      realtimeHub.broadcast({ type: 'state.invalidated', timestamp: new Date().toISOString() });

      return reply.send({ success: true });
    }
  );
};
