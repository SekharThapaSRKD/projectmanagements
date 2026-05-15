import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createStore } from '../storage/json-store.js';
import { env } from '../config/env.js';
import { badRequest, conflict, notFound, unauthorized } from '../lib/errors.js';
import { avatarFor, createId } from '../lib/ids.js';
import { createSeedState } from '../domain/seed.js';
import type {
  AuthAccount,
  AuthProvider,
  AuthUser,
  BootstrapPayload,
  Channel,
  Comment,
  Document,
  Member,
  MemberRole,
  Message,
  OAuthProvider,
  Priority,
  Project,
  ProjectColumn,
  ProjectType,
  Sprint,
  SprintStatus,
  Task,
  TaskStatus,
  TeamFlowState,
  Workspace
} from '../domain/types.js';

export type ResourceName = 'workspaces' | 'projects' | 'sprints' | 'tasks' | 'members' | 'messages' | 'documents' | 'channels';

export interface EmailAuthInput {
  email: string;
  password: string;
}

export interface RegisterAuthInput extends EmailAuthInput {
  name: string;
}

export interface OAuthCallbackQuery {
  code: string | undefined;
  state: string | undefined;
  redirect_uri: string | undefined;
  id_token: string | undefined;
  user: string | undefined;
}

export interface ResourceListFilters {
  workspaceId?: string;
  projectId?: string;
  sprintId?: string;
  channelId?: string;
  assigneeId?: string;
  status?: string;
  q?: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  memberIds?: string[];
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  memberIds?: string[];
}

export interface CreateProjectInput {
  name: string;
  type: ProjectType;
  workspaceId?: string;
  description?: string;
  memberIds?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  type?: ProjectType;
  workspaceId?: string;
  description?: string;
  memberIds?: string[];
  columns?: ProjectColumn[];
}

export interface CreateSprintInput {
  name: string;
  projectId?: string;
  startDate: string;
  endDate: string;
  goal: string;
}

export interface UpdateSprintInput {
  name?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
  status?: SprintStatus;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string | null;
  labels?: string[];
  projectId?: string;
  sprintId?: string | null;
  devNotes?: string;
  codeSnippets?: Task['codeSnippets'];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string | null;
  labels?: string[];
  projectId?: string;
  sprintId?: string | null;
  devNotes?: string;
  codeSnippets?: Task['codeSnippets'];
}

export interface CreateMemberInput {
  name: string;
  email: string;
  role?: MemberRole;
  status?: Member['status'];
}

export interface UpdateMemberInput {
  name?: string;
  email?: string;
  role?: MemberRole;
  status?: Member['status'];
}

export interface CreateMessageInput {
  content: string;
  senderId?: string;
  channelId?: string;
}

export interface CreateDocumentInput {
  title: string;
  content?: string;
  projectId?: string;
  linkedTaskIds?: string[];
  authorId?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  projectId?: string;
  linkedTaskIds?: string[];
  authorId?: string;
}

interface OAuthProfile {
  provider: OAuthProvider;
  email: string;
  name: string;
  avatar: string | undefined;
  role?: MemberRole;
}

interface OAuthProviderConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  scope: string;
  isApple?: boolean;
}

const demoProviderUser = (provider: OAuthProvider): OAuthProfile => {
  const nameMap: Record<OAuthProvider, string> = {
    google: 'Google Demo User',
    github: 'GitHub Demo User',
    apple: 'Apple Demo User'
  };

  return {
    provider,
    name: nameMap[provider],
    email: `${provider}-demo@teamflow.run`,
    avatar: undefined,
    role: 'admin'
  };
};

const hasOAuthConfig = (config: OAuthProviderConfig) => {
  if (config.isApple) {
    return Boolean(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY);
  }

  return Boolean(config.clientId && config.clientSecret);
};

const decodeBase64UrlJson = (token: string) => {
  const body = token.split('.')[1];
  if (!body) {
    throw badRequest('Invalid token payload');
  }

  const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
};

const hashPassword = async (password: string) => bcrypt.hash(password, 10);
const verifyPassword = async (password: string, passwordHash: string) => bcrypt.compare(password, passwordHash);

const createJwt = (account: AuthAccount) =>
  jwt.sign(
    {
      email: account.email,
      provider: account.provider,
      role: account.role,
      memberId: account.memberId
    },
    env.JWT_SECRET,
    { subject: account.id, expiresIn: '7d' }
  );

const normalizeMembers = (members: Member[], memberId: string) => {
  const member = members.find(item => item.id === memberId);
  if (!member) {
    return members;
  }

  return members.map(item => (item.id === memberId ? { ...item, status: 'online' } : item));
};

const uniquePush = <T>(items: T[], item: T) => (items.includes(item) ? items : [...items, item]);

const normalizeState = (state: TeamFlowState): TeamFlowState => ({
  ...state,
  accounts: Array.isArray(state.accounts) ? state.accounts : [],
  workspaces: (state.workspaces ?? []).map(workspace => ({
    ...workspace,
    memberIds: Array.isArray(workspace.memberIds) ? workspace.memberIds : []
  })),
  projects: (state.projects ?? []).map(project => ({
    ...project,
    memberIds: Array.isArray(project.memberIds) ? project.memberIds : [],
    columns: Array.isArray(project.columns) ? project.columns : project.type === 'scrum'
      ? [
          { id: 'backlog', title: 'Backlog' },
          { id: 'todo', title: 'Selected' },
          { id: 'in_progress', title: 'In Progress' },
          { id: 'in_review', title: 'Review' },
          { id: 'done', title: 'Done' }
        ]
      : [
          { id: 'todo', title: 'Todo' },
          { id: 'in_progress', title: 'In Progress' },
          { id: 'in_review', title: 'In Review' },
          { id: 'done', title: 'Done' }
        ]
  })),
  sprints: Array.isArray(state.sprints) ? state.sprints : [],
  tasks: Array.isArray(state.tasks) ? state.tasks : [],
  members: Array.isArray(state.members) ? state.members : [],
  messages: Array.isArray(state.messages) ? state.messages : [],
  documents: Array.isArray(state.documents) ? state.documents : [],
  channels: Array.isArray(state.channels) ? state.channels : [],
  activeWorkspaceId: state.workspaces.some(workspace => workspace.id === state.activeWorkspaceId)
    ? state.activeWorkspaceId
    : state.workspaces[0]?.id ?? '',
  activeProjectId: state.projects.some(project => project.id === state.activeProjectId)
    ? state.activeProjectId
    : state.projects[0]?.id ?? '',
  activeSprintId: state.activeSprintId && state.sprints.some(sprint => sprint.id === state.activeSprintId)
    ? state.activeSprintId
    : state.sprints.find(sprint => sprint.status === 'active')?.id ?? null,
  activeView: state.activeView ?? 'board'
});

const projectColumnsForType = (type: ProjectType): ProjectColumn[] =>
  type === 'scrum'
    ? [
        { id: 'backlog', title: 'Backlog' },
        { id: 'todo', title: 'Selected' },
        { id: 'in_progress', title: 'In Progress' },
        { id: 'in_review', title: 'Review' },
        { id: 'done', title: 'Done' }
      ]
    : [
        { id: 'todo', title: 'Todo' },
        { id: 'in_progress', title: 'In Progress' },
        { id: 'in_review', title: 'In Review' },
        { id: 'done', title: 'Done' }
      ];

const sortByUpdatedDesc = <T>(items: T[]) => [...items];

export interface TeamFlowServiceOptions {
  onWrite?: () => void | Promise<void>;
}

export class TeamFlowService {
  constructor(options: TeamFlowServiceOptions = {}) {
    this.store = createStore('./data/teamflow-db.json', createSeedState, {
      onWrite: () => options.onWrite?.()
    });
  }

  private readonly store;

  async getBootstrap(workspaceId?: string, projectId?: string): Promise<BootstrapPayload> {
    const state = normalizeState(await this.store.read());
    const workspace = workspaceId ? state.workspaces.find(item => item.id === workspaceId) : state.workspaces[0];
    const project = projectId ? state.projects.find(item => item.id === projectId) : state.projects.find(item => item.workspaceId === workspace?.id) ?? state.projects[0];
    const activeTaskCount = state.tasks.filter(task => task.status !== 'done').length;

    return {
      ...state,
      summary: {
        workspaceCount: state.workspaces.length,
        projectCount: state.projects.length,
        activeTaskCount,
        memberCount: state.members.length,
        unreadMessageCount: state.messages.length
      }
    };
  }

  async search(query: string) {
    const state = normalizeState(await this.store.read());
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return { items: [] };
    }

    const tasks = state.tasks.filter(task => [task.title, task.description, task.devNotes, task.labels.join(' ')].join(' ').toLowerCase().includes(needle));
    const documents = state.documents.filter(document => [document.title, document.content].join(' ').toLowerCase().includes(needle));
    const members = state.members.filter(member => [member.name, member.email].join(' ').toLowerCase().includes(needle));
    const projects = state.projects.filter(project => [project.name, project.description, project.key].join(' ').toLowerCase().includes(needle));

    return { tasks, documents, members, projects };
  }

  async authenticateEmail(input: EmailAuthInput) {
    const state = normalizeState(await this.store.read());
    const account = state.accounts.find(item => item.email.toLowerCase() === input.email.toLowerCase() && item.provider === 'email');
    if (!account || !account.passwordHash) {
      throw unauthorized('Invalid email or password');
    }

    const valid = await verifyPassword(input.password, account.passwordHash);
    if (!valid) {
      throw unauthorized('Invalid email or password');
    }

    return { user: this.toAuthUser(account), token: createJwt(account) };
  }

  async registerEmail(input: RegisterAuthInput) {
    const email = input.email.trim().toLowerCase();
    const state = normalizeState(await this.store.read());
    if (state.accounts.some(item => item.email.toLowerCase() === email)) {
      throw conflict('An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const workspace = state.workspaces[0];
    const project = state.projects.find(item => item.workspaceId === workspace?.id) ?? state.projects[0];
    const memberId = createId('mem');
    const accountId = createId('acct');
    const avatar = avatarFor(input.name);
    const now = new Date().toISOString();
    const member: Member = {
      id: memberId,
      name: input.name,
      email,
      avatar,
      role: 'admin',
      status: 'online',
      joinedAt: now
    };

    const account: AuthAccount = {
      id: accountId,
      name: input.name,
      email,
      provider: 'email',
      role: 'admin',
      avatar,
      passwordHash,
      memberId,
      createdAt: now,
      updatedAt: now
    };

    await this.store.update(current => {
      const next = normalizeState(current);
      next.members = [member, ...next.members];
      next.accounts = [account, ...next.accounts];
      if (workspace) {
        next.workspaces = next.workspaces.map(item =>
          item.id === workspace.id ? { ...item, memberIds: uniquePush(item.memberIds, memberId) } : item
        );
      }
      if (project) {
        next.projects = next.projects.map(item =>
          item.id === project.id ? { ...item, memberIds: uniquePush(item.memberIds, memberId) } : item
        );
      }
      return next;
    });

    return { user: this.toAuthUser(account), token: createJwt(account) };
  }

  async oauthStart(provider: OAuthProvider, redirectUri: string) {
    const config = this.getOAuthConfig(provider);
    if (!hasOAuthConfig(config)) {
      const fallbackUrl = new URL(redirectUri);
      fallbackUrl.searchParams.set('code', `demo-${provider}`);
      fallbackUrl.searchParams.set('provider', provider);
      return fallbackUrl.toString();
    }

    const authorizeUrl = new URL(config.authorizeUrl);
    authorizeUrl.searchParams.set('client_id', config.clientId!);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', config.scope);
    authorizeUrl.searchParams.set('state', createId('state'));

    if (provider === 'google') {
      authorizeUrl.searchParams.set('access_type', 'offline');
      authorizeUrl.searchParams.set('prompt', 'consent');
    }

    if (provider === 'apple') {
      authorizeUrl.searchParams.set('response_mode', 'query');
    }

    return authorizeUrl.toString();
  }

  async oauthCallback(provider: OAuthProvider, query: OAuthCallbackQuery, redirectUri: string) {
    const code = query.code?.trim() ?? '';
    if (!code || code.startsWith('demo-')) {
      return this.upsertOAuthProfile(demoProviderUser(provider));
    }

    const config = this.getOAuthConfig(provider);
    if (!hasOAuthConfig(config)) {
      return this.upsertOAuthProfile(demoProviderUser(provider));
    }

    if (provider === 'google') {
      return this.exchangeGoogleCode(code, redirectUri, config);
    }

    if (provider === 'github') {
      return this.exchangeGitHubCode(code, redirectUri, config);
    }

    return this.exchangeAppleCode(code, redirectUri, config);
  }

  async list(resource: ResourceName, filters: ResourceListFilters = {}) {
    const state = normalizeState(await this.store.read());
    switch (resource) {
      case 'workspaces':
        return sortByUpdatedDesc(state.workspaces as Workspace[]);
      case 'projects':
        return sortByUpdatedDesc(this.filterProjects(state.projects, filters));
      case 'sprints':
        return sortByUpdatedDesc(this.filterSprints(state.sprints, filters));
      case 'tasks':
        return sortByUpdatedDesc(this.filterTasks(state.tasks, filters));
      case 'members':
        return sortByUpdatedDesc(state.members as Member[]);
      case 'messages':
        return sortByUpdatedDesc(this.filterMessages(state.messages, filters));
      case 'documents':
        return sortByUpdatedDesc(this.filterDocuments(state.documents, filters));
      case 'channels':
        return sortByUpdatedDesc(state.channels as Channel[]);
      default:
        return [];
    }
  }

  async get(resource: ResourceName, id: string) {
    const items = await this.list(resource);
    const item = items.find(entry => (entry as { id?: string }).id === id);
    if (!item) {
      throw notFound(`${resource.slice(0, -1)} not found`);
    }

    return item;
  }

  async create(resource: ResourceName, input: unknown) {
    switch (resource) {
      case 'workspaces':
        return this.createWorkspace(input as CreateWorkspaceInput);
      case 'projects':
        return this.createProject(input as CreateProjectInput);
      case 'sprints':
        return this.createSprint(input as CreateSprintInput);
      case 'tasks':
        return this.createTask(input as CreateTaskInput);
      case 'members':
        return this.createMember(input as CreateMemberInput);
      case 'messages':
        return this.createMessage(input as CreateMessageInput);
      case 'documents':
        return this.createDocument(input as CreateDocumentInput);
      case 'channels':
        throw badRequest('Channels are derived from workspaces and projects');
      default:
        throw badRequest('Unsupported resource');
    }
  }

  async update(resource: ResourceName, id: string, input: unknown) {
    switch (resource) {
      case 'workspaces':
        return this.updateWorkspace(id, input as UpdateWorkspaceInput);
      case 'projects':
        return this.updateProject(id, input as UpdateProjectInput);
      case 'sprints':
        return this.updateSprint(id, input as UpdateSprintInput);
      case 'tasks':
        return this.updateTask(id, input as UpdateTaskInput);
      case 'members':
        return this.updateMember(id, input as UpdateMemberInput);
      case 'messages':
        throw badRequest('Messages are append-only');
      case 'documents':
        return this.updateDocument(id, input as UpdateDocumentInput);
      case 'channels':
        throw badRequest('Channels cannot be updated directly');
      default:
        throw badRequest('Unsupported resource');
    }
  }

  async remove(resource: ResourceName, id: string) {
    switch (resource) {
      case 'workspaces':
        return this.deleteWorkspace(id);
      case 'projects':
        return this.deleteProject(id);
      case 'sprints':
        return this.deleteSprint(id);
      case 'tasks':
        return this.deleteTask(id);
      case 'members':
        return this.deleteMember(id);
      case 'messages':
        return this.deleteMessage(id);
      case 'documents':
        return this.deleteDocument(id);
      case 'channels':
        return this.deleteChannel(id);
      default:
        throw badRequest('Unsupported resource');
    }
  }

  async addComment(taskId: string, content: string, authorId?: string) {
    return this.store.update(current => {
      const state = normalizeState(current);
      const task = state.tasks.find(item => item.id === taskId);
      if (!task) {
        throw notFound('Task not found');
      }

      const comment: Comment = {
        id: createId('comment'),
        content,
        authorId: authorId ?? state.members[0]?.id ?? 'mem_olivia',
        createdAt: new Date().toISOString()
      };

      state.tasks = state.tasks.map(item => (item.id === taskId ? { ...item, comments: [...item.comments, comment], updatedAt: comment.createdAt } : item));
      return state;
    });
  }

  async analytics(projectId?: string) {
    const state = normalizeState(await this.store.read());
    const project = projectId ? state.projects.find(item => item.id === projectId) : state.projects[0];
    const projectTasks = state.tasks.filter(task => task.projectId === project?.id);
    const total = projectTasks.length || 1;
    const doneCount = projectTasks.filter(task => task.status === 'done').length;

    const statusCounts = ['backlog', 'todo', 'in_progress', 'in_review', 'done'].map(status => ({
      name: status,
      value: projectTasks.filter(task => task.status === status).length
    }));

    const priorityCounts = ['low', 'medium', 'high', 'urgent'].map(priority => ({
      name: priority,
      value: projectTasks.filter(task => task.priority === priority).length
    }));

    const perMember = state.members.map(member => ({
      name: member.name.split(' ')[0],
      value: projectTasks.filter(task => task.assigneeId === member.id).length
    }));

    const burndown = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      day: `D${day + 1}`,
      remaining: Math.max(0, total - Math.round((doneCount / 6) * day))
    }));

    return {
      kpis: {
        totalTasks: projectTasks.length,
        completedTasks: doneCount,
        activeSprintCount: state.sprints.filter(sprint => sprint.projectId === project?.id && sprint.status === 'active').length,
        memberCount: state.members.length
      },
      statusCounts,
      priorityCounts,
      burndown,
      perMember
    };
  }

  private getOAuthConfig(provider: OAuthProvider): OAuthProviderConfig {
    switch (provider) {
      case 'google':
        return {
          clientId: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
          scope: 'openid email profile'
        };
      case 'github':
        return {
          clientId: env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          authorizeUrl: 'https://github.com/login/oauth/authorize',
          tokenUrl: 'https://github.com/login/oauth/access_token',
          userInfoUrl: 'https://api.github.com/user',
          scope: 'read:user user:email'
        };
      case 'apple':
        return {
          clientId: env.APPLE_CLIENT_ID,
          clientSecret: env.APPLE_PRIVATE_KEY,
          authorizeUrl: 'https://appleid.apple.com/auth/authorize',
          tokenUrl: 'https://appleid.apple.com/auth/token',
          scope: 'name email',
          isApple: true
        };
    }
  }

  private async exchangeGoogleCode(code: string, redirectUri: string, config: OAuthProviderConfig) {
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId!,
        client_secret: config.clientSecret!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      throw badRequest('Google OAuth exchange failed');
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenPayload.access_token) {
      throw badRequest('Google access token missing');
    }

    const userResponse = await fetch(config.userInfoUrl!, {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
    });

    if (!userResponse.ok) {
      throw badRequest('Google userinfo request failed');
    }

    const profile = (await userResponse.json()) as Record<string, unknown>;
    return this.upsertOAuthProfile({
      provider: 'google',
      email: String(profile.email ?? 'google-user@teamflow.run'),
      name: String(profile.name ?? 'Google User'),
      avatar: typeof profile.picture === 'string' ? profile.picture : undefined,
      role: 'admin'
    });
  }

  private async exchangeGitHubCode(code: string, redirectUri: string, config: OAuthProviderConfig) {
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: config.clientId!,
        client_secret: config.clientSecret!,
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      throw badRequest('GitHub OAuth exchange failed');
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenPayload.access_token) {
      throw badRequest('GitHub access token missing');
    }

    const userResponse = await fetch(config.userInfoUrl!, {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        'User-Agent': 'TeamFlow Backend'
      }
    });

    if (!userResponse.ok) {
      throw badRequest('GitHub profile request failed');
    }

    const profile = (await userResponse.json()) as Record<string, unknown>;
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        'User-Agent': 'TeamFlow Backend'
      }
    });

    const emails = emailsResponse.ok ? ((await emailsResponse.json()) as Array<Record<string, unknown>>) : [];
    const primaryEmail = emails.find(item => item.primary && item.email)?.email ?? profile.email ?? 'github-user@teamflow.run';

    return this.upsertOAuthProfile({
      provider: 'github',
      email: String(primaryEmail),
      name: String(profile.name ?? profile.login ?? 'GitHub User'),
      avatar: typeof profile.avatar_url === 'string' ? profile.avatar_url : undefined,
      role: 'admin'
    });
  }

  private async exchangeAppleCode(code: string, redirectUri: string, config: OAuthProviderConfig) {
    if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
      return this.upsertOAuthProfile(demoProviderUser('apple'));
    }

    const clientSecret = jwt.sign(
      {},
      env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      {
        algorithm: 'ES256',
        issuer: env.APPLE_TEAM_ID,
        audience: 'https://appleid.apple.com',
        subject: env.APPLE_CLIENT_ID,
        expiresIn: '180d',
        keyid: env.APPLE_KEY_ID
      }
    );

    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.APPLE_CLIENT_ID,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      return this.upsertOAuthProfile(demoProviderUser('apple'));
    }

    const tokenPayload = (await tokenResponse.json()) as { id_token?: string };
    if (!tokenPayload.id_token) {
      return this.upsertOAuthProfile(demoProviderUser('apple'));
    }

    const decoded = decodeBase64UrlJson(tokenPayload.id_token);
    const appleEmail = String(decoded.email ?? 'apple-user@teamflow.run');
    const appleDisplayName = (appleEmail.split('@').shift() ?? 'Apple User').replace(/[._-]+/g, ' ');
    return this.upsertOAuthProfile({
      provider: 'apple',
      email: appleEmail,
      name: appleDisplayName,
      avatar: undefined,
      role: 'admin'
    });
  }

  private async upsertOAuthProfile(profile: OAuthProfile) {
    const email = profile.email.trim().toLowerCase();
    const now = new Date().toISOString();
    const state = normalizeState(await this.store.read());
    const accountIndex = state.accounts.findIndex(item => item.email.toLowerCase() === email);
    const memberIndex = state.members.findIndex(item => item.email.toLowerCase() === email);
    const workspace = state.workspaces[0];
    const project = state.projects.find(item => item.workspaceId === workspace?.id) ?? state.projects[0];

    let account: AuthAccount;
    let member: Member;

    if (accountIndex >= 0 && memberIndex >= 0) {
      const existingAccount = state.accounts[accountIndex];
      const existingMember = state.members[memberIndex];

      if (!existingAccount || !existingMember) {
        throw notFound('OAuth account not found');
      }

      account = {
        ...existingAccount,
        name: profile.name,
        provider: profile.provider,
        role: profile.role ?? existingAccount.role,
        avatar: profile.avatar ?? avatarFor(profile.name),
        updatedAt: now
      };

      member = {
        ...existingMember,
        name: profile.name,
        role: profile.role ?? existingMember.role,
        avatar: profile.avatar ?? avatarFor(profile.name),
        status: 'online'
      };

      await this.store.update(current => {
        const next = normalizeState(current);
        next.accounts = next.accounts.map(item => (item.id === account.id ? account : item));
        next.members = next.members.map(item => (item.id === member.id ? member : item));
        return next;
      });
    } else {
      const memberId = createId('mem');
      const accountId = createId('acct');
      member = {
        id: memberId,
        name: profile.name,
        email,
        avatar: profile.avatar ?? avatarFor(profile.name),
        role: profile.role ?? 'admin',
        status: 'online',
        joinedAt: now
      };

      account = {
        id: accountId,
        name: profile.name,
        email,
        provider: profile.provider,
        role: profile.role ?? 'admin',
        avatar: member.avatar,
        memberId,
        createdAt: now,
        updatedAt: now
      };

      await this.store.update(current => {
        const next = normalizeState(current);
        next.members = [member, ...next.members];
        next.accounts = [account, ...next.accounts];
        if (workspace) {
          next.workspaces = next.workspaces.map(item =>
            item.id === workspace.id ? { ...item, memberIds: uniquePush(item.memberIds, member.id) } : item
          );
        }
        if (project) {
          next.projects = next.projects.map(item =>
            item.id === project.id ? { ...item, memberIds: uniquePush(item.memberIds, member.id) } : item
          );
        }
        return next;
      });
    }

    return {
      user: this.toAuthUser(account),
      token: createJwt(account)
    };
  }

  private toAuthUser(account: AuthAccount): AuthUser {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      provider: account.provider,
      role: account.role,
      avatar: account.avatar
    };
  }

  private filterProjects(projects: Project[], filters: ResourceListFilters) {
    return projects.filter(project => !filters.workspaceId || project.workspaceId === filters.workspaceId);
  }

  private filterSprints(sprints: Sprint[], filters: ResourceListFilters) {
    return sprints.filter(sprint => !filters.projectId || sprint.projectId === filters.projectId);
  }

  private filterTasks(tasks: Task[], filters: ResourceListFilters) {
    return tasks.filter(task => {
      if (filters.projectId && task.projectId !== filters.projectId) return false;
      if (filters.sprintId && task.sprintId !== filters.sprintId) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.assigneeId && task.assigneeId !== filters.assigneeId) return false;
      if (!filters.q) return true;
      const needle = filters.q.toLowerCase();
      return [task.title, task.description, task.devNotes, task.labels.join(' ')].join(' ').toLowerCase().includes(needle);
    });
  }

  private filterMessages(messages: Message[], filters: ResourceListFilters) {
    return messages.filter(message => !filters.channelId || message.channelId === filters.channelId);
  }

  private filterDocuments(documents: Document[], filters: ResourceListFilters) {
    return documents.filter(document => !filters.projectId || document.projectId === filters.projectId);
  }

  private async createWorkspace(input: CreateWorkspaceInput) {
    if (!input.name.trim()) {
      throw badRequest('Workspace name is required');
    }

    const workspace: Workspace = {
      id: createId('ws'),
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      memberIds: input.memberIds ?? []
    };

    await this.store.update(current => {
      const state = normalizeState(current);
      state.workspaces = [workspace, ...state.workspaces];
      state.activeWorkspaceId = workspace.id;
      return state;
    });

    return workspace;
  }

  private async updateWorkspace(id: string, input: UpdateWorkspaceInput) {
    let updated: Workspace | null = null;
    await this.store.update(current => {
      const state = normalizeState(current);
      state.workspaces = state.workspaces.map(workspace => {
        if (workspace.id !== id) return workspace;
        updated = {
          ...workspace,
          name: input.name?.trim() || workspace.name,
          description: input.description?.trim() ?? workspace.description,
          memberIds: input.memberIds ?? workspace.memberIds
        };
        return updated;
      });
      return state;
    });

    if (!updated) {
      throw notFound('Workspace not found');
    }

    return updated;
  }

  private async deleteWorkspace(id: string) {
    await this.store.update(current => {
      const state = normalizeState(current);
      if (!state.workspaces.some(workspace => workspace.id === id)) {
        throw notFound('Workspace not found');
      }

      const projectIds = state.projects.filter(project => project.workspaceId === id).map(project => project.id);
      const sprintIds = state.sprints.filter(sprint => projectIds.includes(sprint.projectId)).map(sprint => sprint.id);
      const taskIds = state.tasks.filter(task => projectIds.includes(task.projectId)).map(task => task.id);
      const channelIds = state.channels.filter(channel => channel.type === 'workspace' && channel.relatedId === id).map(channel => channel.id);

      state.workspaces = state.workspaces.filter(workspace => workspace.id !== id);
      state.projects = state.projects.filter(project => project.workspaceId !== id);
      state.sprints = state.sprints.filter(sprint => !projectIds.includes(sprint.projectId));
      state.tasks = state.tasks.filter(task => !projectIds.includes(task.projectId));
      state.documents = state.documents.filter(document => !projectIds.includes(document.projectId));
      state.messages = state.messages.filter(message => !channelIds.includes(message.channelId));
      state.channels = state.channels.filter(channel => !(channel.type === 'workspace' && channel.relatedId === id));
      state.accounts = state.accounts.filter(account => !taskIds.includes(account.memberId));
      if (state.activeWorkspaceId === id) {
        state.activeWorkspaceId = state.workspaces[0]?.id ?? '';
      }
      return state;
    });
  }

  private async createProject(input: CreateProjectInput) {
    if (!input.name.trim()) {
      throw badRequest('Project name is required');
    }

    const state = normalizeState(await this.store.read());
    const workspace = state.workspaces.find(item => item.id === (input.workspaceId ?? state.workspaces[0]?.id));
    if (!workspace) {
      throw badRequest('Workspace not found');
    }

    const project: Project = {
      id: createId('proj'),
      name: input.name.trim(),
      key: input.name.replace(/[^a-z0-9]+/gi, '').slice(0, 3).toUpperCase() || 'PRJ',
      type: input.type,
      workspaceId: workspace.id,
      columns: projectColumnsForType(input.type),
      memberIds: input.memberIds ?? workspace.memberIds,
      description: input.description?.trim() ?? ''
    };

    const channel: Channel = {
      id: createId('channel'),
      name: `#${project.key.toLowerCase()}`,
      type: 'project',
      relatedId: project.id
    };

    await this.store.update(current => {
      const next = normalizeState(current);
      next.projects = [project, ...next.projects];
      next.channels = [channel, ...next.channels];
      next.activeProjectId = project.id;
      next.activeView = 'board';
      return next;
    });

    return project;
  }

  private async updateProject(id: string, input: UpdateProjectInput) {
    let updated: Project | null = null;
    await this.store.update(current => {
      const state = normalizeState(current);
      state.projects = state.projects.map(project => {
        if (project.id !== id) return project;
        updated = {
          ...project,
          name: input.name?.trim() || project.name,
          type: input.type ?? project.type,
          workspaceId: input.workspaceId ?? project.workspaceId,
          description: input.description?.trim() ?? project.description,
          memberIds: input.memberIds ?? project.memberIds,
          columns: input.columns ?? project.columns
        };
        return updated;
      });
      return state;
    });

    if (!updated) {
      throw notFound('Project not found');
    }

    return updated;
  }

  private async deleteProject(id: string) {
    await this.store.update(current => {
      const state = normalizeState(current);
      if (!state.projects.some(project => project.id === id)) {
        throw notFound('Project not found');
      }

      const sprintIds = state.sprints.filter(sprint => sprint.projectId === id).map(sprint => sprint.id);
      const taskIds = state.tasks.filter(task => task.projectId === id).map(task => task.id);
      const channelIds = state.channels.filter(channel => channel.type === 'project' && channel.relatedId === id).map(channel => channel.id);

      state.projects = state.projects.filter(project => project.id !== id);
      state.sprints = state.sprints.filter(sprint => sprint.projectId !== id);
      state.tasks = state.tasks.filter(task => task.projectId !== id);
      state.documents = state.documents.filter(document => document.projectId !== id);
      state.messages = state.messages.filter(message => !channelIds.includes(message.channelId));
      state.channels = state.channels.filter(channel => !(channel.type === 'project' && channel.relatedId === id));
      state.members = state.members.map(member => ({
        ...member,
        status: sprintIds.length || taskIds.length ? member.status : member.status
      }));
      if (state.activeProjectId === id) {
        state.activeProjectId = state.projects[0]?.id ?? '';
      }
      if (state.activeSprintId && sprintIds.includes(state.activeSprintId)) {
        state.activeSprintId = state.sprints.find(sprint => sprint.projectId === state.activeProjectId && sprint.status === 'active')?.id ?? null;
      }
      return state;
    });
  }

  private async createSprint(input: CreateSprintInput) {
    if (!input.name.trim()) {
      throw badRequest('Sprint name is required');
    }

    const state = normalizeState(await this.store.read());
    const project = state.projects.find(item => item.id === (input.projectId ?? state.projects[0]?.id));
    if (!project) {
      throw badRequest('Project not found');
    }

    const sprint: Sprint = {
      id: createId('sprint'),
      name: input.name.trim(),
      projectId: project.id,
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'planning',
      goal: input.goal.trim()
    };

    await this.store.update(current => {
      const next = normalizeState(current);
      next.sprints = [sprint, ...next.sprints];
      next.activeSprintId = sprint.id;
      return next;
    });

    return sprint;
  }

  private async updateSprint(id: string, input: UpdateSprintInput) {
    let updated: Sprint | null = null;
    await this.store.update(current => {
      const state = normalizeState(current);
      state.sprints = state.sprints.map(sprint => {
        if (sprint.id !== id) return sprint;
        updated = {
          ...sprint,
          name: input.name?.trim() || sprint.name,
          projectId: input.projectId ?? sprint.projectId,
          startDate: input.startDate ?? sprint.startDate,
          endDate: input.endDate ?? sprint.endDate,
          goal: input.goal?.trim() ?? sprint.goal,
          status: input.status ?? sprint.status
        };
        return updated;
      });
      return state;
    });

    if (!updated) {
      throw notFound('Sprint not found');
    }

    return updated;
  }

  private async deleteSprint(id: string) {
    await this.store.update(current => {
      const state = normalizeState(current);
      if (!state.sprints.some(sprint => sprint.id === id)) {
        throw notFound('Sprint not found');
      }

      state.sprints = state.sprints.filter(sprint => sprint.id !== id);
      state.tasks = state.tasks.map(task => (task.sprintId === id ? { ...task, sprintId: null } : task));
      if (state.activeSprintId === id) {
        state.activeSprintId = state.sprints.find(sprint => sprint.status === 'active')?.id ?? null;
      }
      return state;
    });
  }

  private async createTask(input: CreateTaskInput) {
    if (!input.title.trim()) {
      throw badRequest('Task title is required');
    }

    const state = normalizeState(await this.store.read());
    const project = state.projects.find(item => item.id === (input.projectId ?? state.projects[0]?.id));
    if (!project) {
      throw badRequest('Project not found');
    }

    const now = new Date().toISOString();
    const task: Task = {
      id: createId('task'),
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      assigneeId: input.assigneeId ?? null,
      labels: input.labels ?? [],
      comments: [],
      projectId: project.id,
      sprintId: input.sprintId ?? null,
      codeSnippets: input.codeSnippets ?? [],
      devNotes: input.devNotes?.trim() ?? '',
      createdAt: now,
      updatedAt: now
    };

    await this.store.update(current => {
      const next = normalizeState(current);
      next.tasks = [task, ...next.tasks];
      return next;
    });

    return task;
  }

  private async updateTask(id: string, input: UpdateTaskInput) {
    let updated: Task | null = null;
    await this.store.update(current => {
      const state = normalizeState(current);
      state.tasks = state.tasks.map(task => {
        if (task.id !== id) return task;
        updated = {
          ...task,
          title: input.title?.trim() || task.title,
          description: input.description?.trim() ?? task.description,
          status: input.status ?? task.status,
          priority: input.priority ?? task.priority,
          assigneeId: input.assigneeId ?? task.assigneeId,
          labels: input.labels ?? task.labels,
          projectId: input.projectId ?? task.projectId,
          sprintId: input.sprintId ?? task.sprintId,
          devNotes: input.devNotes?.trim() ?? task.devNotes,
          codeSnippets: input.codeSnippets ?? task.codeSnippets,
          updatedAt: new Date().toISOString()
        };
        return updated;
      });
      return state;
    });

    if (!updated) {
      throw notFound('Task not found');
    }

    return updated;
  }

  private async deleteTask(id: string) {
    await this.store.update(current => {
      const state = normalizeState(current);
      if (!state.tasks.some(task => task.id === id)) {
        throw notFound('Task not found');
      }

      state.tasks = state.tasks.filter(task => task.id !== id);
      state.documents = state.documents.map(document => ({
        ...document,
        linkedTaskIds: document.linkedTaskIds.filter(taskId => taskId !== id)
      }));
      return state;
    });
  }

  private async createMember(input: CreateMemberInput) {
    if (!input.name.trim() || !input.email.trim()) {
      throw badRequest('Member name and email are required');
    }

    const state = normalizeState(await this.store.read());
    if (state.members.some(member => member.email.toLowerCase() === input.email.trim().toLowerCase())) {
      throw conflict('Member already exists');
    }

    const member: Member = {
      id: createId('mem'),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      avatar: avatarFor(input.name),
      role: input.role ?? 'developer',
      status: input.status ?? 'offline',
      joinedAt: new Date().toISOString()
    };

    await this.store.update(current => {
      const next = normalizeState(current);
      next.members = [member, ...next.members];
      const primaryWorkspace = next.workspaces[0];
      if (primaryWorkspace) {
        next.workspaces = next.workspaces.map(workspace => ({
          ...workspace,
          memberIds: workspace.id === primaryWorkspace.id ? uniquePush(workspace.memberIds, member.id) : workspace.memberIds
        }));
      }
      return next;
    });

    return member;
  }

  private async updateMember(id: string, input: UpdateMemberInput) {
    let updated: Member | null = null;
    await this.store.update(current => {
      const state = normalizeState(current);
      state.members = state.members.map(member => {
        if (member.id !== id) return member;
        updated = {
          ...member,
          name: input.name?.trim() || member.name,
          email: input.email?.trim().toLowerCase() ?? member.email,
          role: input.role ?? member.role,
          status: input.status ?? member.status,
          avatar: input.name ? avatarFor(input.name) : member.avatar
        };
        return updated;
      });
      return state;
    });

    if (!updated) {
      throw notFound('Member not found');
    }

    return updated;
  }

  private async deleteMember(id: string) {
    await this.store.update(current => {
      const state = normalizeState(current);
      if (!state.members.some(member => member.id === id)) {
        throw notFound('Member not found');
      }

      state.members = state.members.filter(member => member.id !== id);
      state.accounts = state.accounts.filter(account => account.memberId !== id);
      state.workspaces = state.workspaces.map(workspace => ({
        ...workspace,
        memberIds: workspace.memberIds.filter(memberId => memberId !== id)
      }));
      state.projects = state.projects.map(project => ({
        ...project,
        memberIds: project.memberIds.filter(memberId => memberId !== id)
      }));
      state.tasks = state.tasks.map(task => (task.assigneeId === id ? { ...task, assigneeId: null } : task));
      state.messages = state.messages.filter(message => message.senderId !== id);
      state.documents = state.documents.map(document => (document.authorId === id ? { ...document, authorId: state.members[0]?.id ?? document.authorId } : document));
      return state;
    });
  }

  private async createMessage(input: CreateMessageInput) {
    if (!input.content.trim()) {
      throw badRequest('Message content is required');
    }

    const state = normalizeState(await this.store.read());
    const senderId = input.senderId ?? state.members[0]?.id;
    if (!senderId) {
      throw badRequest('No sender available');
    }

    const channelId = input.channelId ?? state.channels[0]?.id;
    if (!channelId) {
      throw badRequest('No channel available');
    }

    const message: Message = {
      id: createId('msg'),
      content: input.content.trim(),
      senderId,
      channelId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
      reactions: [],
      mentions: [],
      readBy: [senderId]
    };

    await this.store.update(current => {
      const next = normalizeState(current);
      next.messages = [message, ...next.messages];
      return next;
    });

    return message;
  }

  private async deleteMessage(id: string) {
    await this.store.update(current => {
      const state = normalizeState(current);
      if (!state.messages.some(message => message.id === id)) {
        throw notFound('Message not found');
      }
      state.messages = state.messages.filter(message => message.id !== id);
      return state;
    });
  }

  private async createDocument(input: CreateDocumentInput) {
    if (!input.title.trim()) {
      throw badRequest('Document title is required');
    }

    const state = normalizeState(await this.store.read());
    const project = state.projects.find(item => item.id === (input.projectId ?? state.projects[0]?.id));
    if (!project) {
      throw badRequest('Project not found');
    }

    const document: Document = {
      id: createId('doc'),
      title: input.title.trim(),
      content: input.content?.trim() ?? '# Untitled document\n\nStart writing here.',
      projectId: project.id,
      linkedTaskIds: input.linkedTaskIds ?? [],
      authorId: input.authorId ?? state.members[0]?.id ?? 'mem_olivia',
      updatedAt: new Date().toISOString()
    };

    await this.store.update(current => {
      const next = normalizeState(current);
      next.documents = [document, ...next.documents];
      return next;
    });

    return document;
  }

  private async updateDocument(id: string, input: UpdateDocumentInput) {
    let updated: Document | null = null;
    await this.store.update(current => {
      const state = normalizeState(current);
      state.documents = state.documents.map(document => {
        if (document.id !== id) return document;
        updated = {
          ...document,
          title: input.title?.trim() || document.title,
          content: input.content?.trim() ?? document.content,
          projectId: input.projectId ?? document.projectId,
          linkedTaskIds: input.linkedTaskIds ?? document.linkedTaskIds,
          authorId: input.authorId ?? document.authorId,
          updatedAt: new Date().toISOString()
        };
        return updated;
      });
      return state;
    });

    if (!updated) {
      throw notFound('Document not found');
    }

    return updated;
  }

  private async deleteDocument(id: string) {
    await this.store.update(current => {
      const state = normalizeState(current);
      if (!state.documents.some(document => document.id === id)) {
        throw notFound('Document not found');
      }
      state.documents = state.documents.filter(document => document.id !== id);
      return state;
    });
  }

  private async deleteChannel(id: string) {
    await this.store.update(current => {
      const state = normalizeState(current);
      if (!state.channels.some(channel => channel.id === id)) {
        throw notFound('Channel not found');
      }
      state.channels = state.channels.filter(channel => channel.id !== id);
      state.messages = state.messages.filter(message => message.channelId !== id);
      return state;
    });
  }
}
