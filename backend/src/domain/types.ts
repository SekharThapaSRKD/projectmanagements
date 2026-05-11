export const taskStatuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done'] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const priorityLevels = ['low', 'medium', 'high', 'urgent'] as const;
export type Priority = (typeof priorityLevels)[number];

export const projectTypes = ['kanban', 'scrum'] as const;
export type ProjectType = (typeof projectTypes)[number];

export const sprintStatuses = ['planning', 'active', 'completed'] as const;
export type SprintStatus = (typeof sprintStatuses)[number];

export const memberRoles = ['owner', 'admin', 'manager', 'developer', 'viewer'] as const;
export type MemberRole = (typeof memberRoles)[number];

export const memberStatuses = ['online', 'offline', 'away'] as const;
export type MemberStatus = (typeof memberStatuses)[number];

export const channelTypes = ['workspace', 'project'] as const;
export type ChannelType = (typeof channelTypes)[number];

export const authProviders = ['google', 'github', 'apple', 'email'] as const;
export type AuthProvider = (typeof authProviders)[number];
export type OAuthProvider = Exclude<AuthProvider, 'email'>;

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
}

export interface CodeSnippet {
  id: string;
  language: string;
  code: string;
  filename: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  labels: string[];
  comments: Comment[];
  projectId: string;
  sprintId: string | null;
  codeSnippets: CodeSnippet[];
  devNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectColumn {
  id: TaskStatus;
  title: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  type: ProjectType;
  workspaceId: string;
  columns: ProjectColumn[];
  memberIds: string[];
  description: string;
}

export interface Sprint {
  id: string;
  name: string;
  projectId: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  goal: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  channelId: string;
  createdAt: string;
  voiceUrl?: string;
  duration?: number;
  attachments?: {
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
  }[];
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  relatedId: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  projectId: string;
  linkedTaskIds: string[];
  authorId: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider: AuthProvider;
  role: MemberRole;
  avatar: string;
}

export interface AuthAccount {
  id: string;
  name: string;
  email: string;
  provider: AuthProvider;
  role: MemberRole;
  avatar: string;
  passwordHash?: string;
  memberId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermissions {
  canManageMembers: boolean;
  canManageProjects: boolean;
  canManageSprints: boolean;
  canDeleteTasks: boolean;
  canEditAllTasks: boolean;
  canAccessAdmin: boolean;
  canManageRoles: boolean;
  canViewAnalytics: boolean;
  canManageDocs: boolean;
}

export const ROLE_PERMISSIONS: Record<MemberRole, RolePermissions> = {
  owner: {
    canManageMembers: true,
    canManageProjects: true,
    canManageSprints: true,
    canDeleteTasks: true,
    canEditAllTasks: true,
    canAccessAdmin: true,
    canManageRoles: true,
    canViewAnalytics: true,
    canManageDocs: true
  },
  admin: {
    canManageMembers: true,
    canManageProjects: true,
    canManageSprints: true,
    canDeleteTasks: true,
    canEditAllTasks: true,
    canAccessAdmin: true,
    canManageRoles: false,
    canViewAnalytics: true,
    canManageDocs: true
  },
  manager: {
    canManageMembers: false,
    canManageProjects: true,
    canManageSprints: true,
    canDeleteTasks: true,
    canEditAllTasks: true,
    canAccessAdmin: false,
    canManageRoles: false,
    canViewAnalytics: true,
    canManageDocs: true
  },
  developer: {
    canManageMembers: false,
    canManageProjects: false,
    canManageSprints: false,
    canDeleteTasks: false,
    canEditAllTasks: false,
    canAccessAdmin: false,
    canManageRoles: false,
    canViewAnalytics: true,
    canManageDocs: true
  },
  viewer: {
    canManageMembers: false,
    canManageProjects: false,
    canManageSprints: false,
    canDeleteTasks: false,
    canEditAllTasks: false,
    canAccessAdmin: false,
    canManageRoles: false,
    canViewAnalytics: true,
    canManageDocs: false
  }
};

export interface TeamFlowState {
  accounts: AuthAccount[];
  workspaces: Workspace[];
  projects: Project[];
  sprints: Sprint[];
  tasks: Task[];
  members: Member[];
  messages: Message[];
  documents: Document[];
  channels: Channel[];
  activeWorkspaceId: string;
  activeProjectId: string;
  activeSprintId: string | null;
  activeView: 'board' | 'backlog' | 'sprints' | 'chat' | 'analytics' | 'docs';
}

export interface BootstrapPayload extends TeamFlowState {
  summary: {
    workspaceCount: number;
    projectCount: number;
    activeTaskCount: number;
    memberCount: number;
    unreadMessageCount: number;
  };
}
