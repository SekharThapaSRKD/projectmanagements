import { Db } from 'mongodb';
import { nanoid } from 'nanoid';
import type {
  Account,
  Workspace,
  Project,
  Board,
  Task,
  Message,
  Sprint,
  Channel,
  Document,
  Invitation,
  Member,
  Subscription,
} from '../types/models.js';

export class MongoService {
  constructor(private db: Db) {}

  // ===== ACCOUNTS =====
  async createAccount(account: Omit<Account, '_id'>): Promise<Account> {
    const result = await this.db.collection('accounts').insertOne(account as any);
    return { ...account, _id: result.insertedId };
  }

  async findAccountByEmail(email: string): Promise<Account | null> {
    return this.db.collection('accounts').findOne({ email }) as Promise<Account | null>;
  }

  async findAccountByProviderId(providerId: string): Promise<Account | null> {
    return this.db.collection('accounts').findOne({ providerId }) as Promise<Account | null>;
  }

  async findAccountById(id: string): Promise<Account | null> {
    return this.db.collection('accounts').findOne({ id }) as Promise<Account | null>;
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account | null> {
    const setFields: Record<string, unknown> = { updatedAt: new Date() };
    const unsetFields: Record<string, ''> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) {
        unsetFields[key] = '';
      } else {
        setFields[key] = value;
      }
    }

    await this.db.collection('accounts').updateOne(
      { id },
      {
        ...(Object.keys(setFields).length ? { $set: setFields } : {}),
        ...(Object.keys(unsetFields).length ? { $unset: unsetFields } : {})
      }
    );
    return this.findAccountById(id);
  }

  async deleteAccount(id: string): Promise<void> {
    // Get all workspaces owned by this account
    const workspaces = await this.getOwnedWorkspaces(id);
    
    // Delete all projects and tasks in those workspaces
    for (const workspace of workspaces) {
      const projects = await this.db.collection('projects').find({ workspaceId: workspace.id }).toArray();
      for (const project of projects as any[]) {
        await this.deleteProject(project.id);
        await this.db.collection('tasks').deleteMany({ projectId: project.id });
      }
    }

    // Delete all workspaces owned by this account
    for (const workspace of workspaces) {
      await this.db.collection('workspaces').deleteOne({ id: workspace.id });
    }

    // Delete all members associated with this account
    await this.db.collection('members').deleteMany({ accountId: id });

    // Delete all invitations sent by or to this account
    await this.db.collection('invitations').deleteMany({ $or: [{ senderId: id }, { accountId: id }] });

    // Delete all documents created by this account
    await this.db.collection('documents').deleteMany({ createdBy: id });

    // Delete all channels, boards, and tasks associated with workspaces
    for (const workspace of workspaces) {
      await this.db.collection('channels').deleteMany({ workspaceId: workspace.id });
      await this.db.collection('boards').deleteMany({ workspaceId: workspace.id });
    }

    // Delete the account itself
    await this.db.collection('accounts').deleteOne({ id });
  }

  // ===== WORKSPACES =====
  async createWorkspace(workspace: Omit<Workspace, '_id'>): Promise<Workspace> {
    const result = await this.db.collection('workspaces').insertOne(workspace as any);
    return { ...workspace, _id: result.insertedId };
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    return this.db.collection('workspaces').findOne({ id }) as Promise<Workspace | null>;
  }

  async getUserWorkspaces(userId: string, memberId?: string): Promise<Workspace[]> {
    const query = memberId 
      ? { $or: [{ ownerId: userId }, { memberIds: memberId }] }
      : { ownerId: userId };
    return this.db.collection('workspaces').find(query).toArray() as Promise<Workspace[]>;
  }

  async getOwnedWorkspaces(userId: string): Promise<Workspace[]> {
    return this.db.collection('workspaces').find({ ownerId: userId }).toArray() as Promise<Workspace[]>;
  }

  async addMemberToWorkspace(workspaceId: string, memberId: string): Promise<void> {
    await this.db
      .collection('workspaces')
      .updateOne({ id: workspaceId }, { $addToSet: { memberIds: memberId } });
  }

  async removeMemberFromWorkspace(workspaceId: string, memberId: string): Promise<void> {
    await this.db
      .collection('workspaces')
      .updateOne({ id: workspaceId }, { $pull: { memberIds: memberId } as any });
  }

  // ===== PROJECTS =====
  async createProject(project: Omit<Project, '_id'>): Promise<Project> {
    const result = await this.db.collection('projects').insertOne(project as any);
    return { ...project, _id: result.insertedId };
  }

  async getProject(id: string): Promise<Project | null> {
    return this.db.collection('projects').findOne({ id }) as Promise<Project | null>;
  }

  async getWorkspaceProjects(workspaceId: string): Promise<Project[]> {
    return this.db.collection('projects').find({ workspaceId }).toArray() as Promise<Project[]>;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    await this.db.collection('projects').updateOne({ id }, { $set: updates });
    const updated = await this.db.collection('projects').findOne({ id }) as Project;
    return updated;
  }

  async addMemberToProject(projectId: string, memberId: string): Promise<void> {
    await this.db
      .collection('projects')
      .updateOne({ id: projectId }, { $addToSet: { memberIds: memberId } as any });
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.collection('projects').deleteOne({ id });
  }

  // ===== BOARDS =====
  async createBoard(board: Omit<Board, '_id'>): Promise<Board> {
    const result = await this.db.collection('boards').insertOne(board as any);
    return { ...board, _id: result.insertedId };
  }

  async getBoard(id: string): Promise<Board | null> {
    return this.db.collection('boards').findOne({ id }) as Promise<Board | null>;
  }

  async getBoardsByProject(projectId: string): Promise<Board[]> {
    return this.db.collection('boards').find({ projectId }).toArray() as Promise<Board[]>;
  }

  async getBoardsByWorkspace(workspaceId: string): Promise<Board[]> {
    return this.db.collection('boards').find({ workspaceId }).toArray() as Promise<Board[]>;
  }

  async updateBoard(id: string, updates: Partial<Board>): Promise<Board> {
    await this.db.collection('boards').updateOne({ id }, { $set: updates });
    const updated = await this.db.collection('boards').findOne({ id }) as Board;
    return updated;
  }

  async deleteBoard(id: string): Promise<void> {
    await this.db.collection('boards').deleteOne({ id });
  }

  // ===== TASKS =====
  async createTask(task: Omit<Task, '_id'>): Promise<Task> {
    const result = await this.db.collection('tasks').insertOne(task as any);
    return { ...task, _id: result.insertedId };
  }

  async getTask(id: string): Promise<Task | null> {
    return this.db.collection('tasks').findOne({ id }) as Promise<Task | null>;
  }

  async getProjectTasks(projectId: string): Promise<Task[]> {
    return this.db.collection('tasks').find({ projectId }).toArray() as Promise<Task[]>;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    await this.db.collection('tasks').updateOne({ id }, { $set: { ...updates, updatedAt: new Date() } });
  }

  async deleteTask(id: string): Promise<void> {
    await this.db.collection('tasks').deleteOne({ id });
  }

  // ===== MESSAGES =====
  async createMessage(message: Omit<Message, '_id'>): Promise<Message> {
    const result = await this.db.collection('messages').insertOne(message as any);
    return { ...message, _id: result.insertedId };
  }

  async getChannelMessages(channelId: string, limit: number = 50): Promise<Message[]> {
    const msgs = await this.db
      .collection('messages')
      .find({ channelId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // return chronological order (oldest first)
    return (msgs as Message[]).reverse();
  }

  // ===== CHANNELS =====
  async createChannel(channel: Omit<Channel, '_id'>): Promise<Channel> {
    const result = await this.db.collection('channels').insertOne(channel as any);
    return { ...channel, _id: result.insertedId };
  }

  async getChannel(id: string): Promise<Channel | null> {
    return this.db.collection('channels').findOne({ id }) as Promise<Channel | null>;
  }

  async getWorkspaceChannels(workspaceId: string): Promise<Channel[]> {
    return this.db.collection('channels').find({ workspaceId }).toArray() as Promise<Channel[]>;
  }

  async addMemberToChannel(channelId: string, memberId: string): Promise<void> {
    await this.db.collection('channels').updateOne({ id: channelId }, { $addToSet: { memberIds: memberId } });
  }

  // ===== SPRINTS =====
  async createSprint(sprint: Omit<Sprint, '_id'>): Promise<Sprint> {
    const result = await this.db.collection('sprints').insertOne(sprint as any);
    return { ...sprint, _id: result.insertedId };
  }

  async getSprint(id: string): Promise<Sprint | null> {
    return this.db.collection('sprints').findOne({ id }) as Promise<Sprint | null>;
  }

  async getProjectSprints(projectId: string): Promise<Sprint[]> {
    return this.db.collection('sprints').find({ projectId }).toArray() as Promise<Sprint[]>;
  }

  async updateSprint(id: string, updates: Partial<Sprint>): Promise<void> {
    await this.db.collection('sprints').updateOne({ id }, { $set: updates });
  }

  // ===== DOCUMENTS =====
  async createDocument(doc: Omit<Document, '_id'>): Promise<Document> {
    const result = await this.db.collection('documents').insertOne(doc as any);
    return { ...doc, _id: result.insertedId };
  }

  async getDocument(id: string): Promise<Document | null> {
    return this.db.collection('documents').findOne({ id }) as Promise<Document | null>;
  }

  async getProjectDocuments(projectId: string): Promise<Document[]> {
    return this.db.collection('documents').find({ projectId }).toArray() as Promise<Document[]>;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | null> {
    const result = await this.db.collection('documents').findOneAndUpdate(
      { id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result as Document | null;
  }

  async deleteDocument(id: string): Promise<void> {
    await this.db.collection('documents').deleteOne({ id });
  }

  async storeDocumentFile(documentId: string, file: any): Promise<void> {
    await this.db.collection('document_files').insertOne({
      documentId,
      fileId: file.id,
      data: file.data,
      createdAt: new Date(),
    });
  }

  async getDocumentFile(documentId: string, fileId: string): Promise<any> {
    return this.db.collection('document_files').findOne({ documentId, fileId });
  }

  async deleteDocumentFile(documentId: string, fileId: string): Promise<void> {
    await this.db.collection('document_files').deleteOne({ documentId, fileId });
  }

  // ===== INVITATIONS =====
  async createInvitation(invitation: Omit<Invitation, '_id'>): Promise<Invitation> {
    const result = await this.db.collection('invitations').insertOne(invitation as any);
    return { ...invitation, _id: result.insertedId };
  }

  async findInvitation(token: string): Promise<Invitation | null> {
    return this.db.collection('invitations').findOne({ token }) as Promise<Invitation | null>;
  }

  async getPendingInvitations(workspaceId: string): Promise<Invitation[]> {
    return this.db
      .collection('invitations')
      .find({ workspaceId, status: 'pending' })
      .toArray() as Promise<Invitation[]>;
  }

  async deleteInvitationById(id: string): Promise<void> {
    await this.db.collection('invitations').deleteOne({ id });
  }

  async acceptInvitation(token: string): Promise<void> {
    await this.db
      .collection('invitations')
      .updateOne({ token }, { $set: { status: 'accepted', updatedAt: new Date() } });
  }

  // ===== SUBSCRIPTIONS =====
  async createSubscription(subscription: Omit<Subscription, '_id'>): Promise<Subscription> {
    const result = await this.db.collection('subscriptions').insertOne(subscription as any);
    return { ...subscription, _id: result.insertedId };
  }

  async getSubscriptionByAccountId(accountId: string): Promise<Subscription | null> {
    return this.db.collection('subscriptions').findOne({ accountId }) as Promise<Subscription | null>;
  }

  async getSubscriptionById(id: string): Promise<Subscription | null> {
    return this.db.collection('subscriptions').findOne({ id }) as Promise<Subscription | null>;
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<void> {
    await this.db
      .collection('subscriptions')
      .updateOne({ id }, { $set: { ...updates, updatedAt: new Date() } });
  }

  async updateSubscriptionByCustomerId(stripeCustomerId: string, updates: Partial<Subscription>): Promise<void> {
    await this.db
      .collection('subscriptions')
      .updateOne({ stripeCustomerId }, { $set: { ...updates, updatedAt: new Date() } });
  }

  async getSubscriptionByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | null> {
    return this.db
      .collection('subscriptions')
      .findOne({ stripeCustomerId }) as Promise<Subscription | null>;
  }
}
