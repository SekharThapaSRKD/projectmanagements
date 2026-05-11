export const taskStatuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done'] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const priorityLevels = ['low', 'medium', 'high', 'urgent'] as const;
export type Priority = (typeof priorityLevels)[number];

export const taskTypes = ['story', 'task', 'bug', 'epic'] as const;
export type TaskType = (typeof taskTypes)[number];

export const projectTypes = ['kanban', 'scrum'] as const;
export type ProjectType = (typeof projectTypes)[number];

export const sprintStatuses = ['planned', 'active', 'completed'] as const;
export type SprintStatus = (typeof sprintStatuses)[number];

export const memberRoles = ['owner', 'admin', 'manager', 'developer', 'viewer'] as const;
export type MemberRole = (typeof memberRoles)[number];

export const memberStatuses = ['online', 'offline', 'away'] as const;
export type MemberStatus = (typeof memberStatuses)[number];

export const subscriptionTiers = ['free', 'pro', 'enterprise'] as const;
export type SubscriptionTier = (typeof subscriptionTiers)[number];

export const meetingStatuses = ['scheduled', 'completed', 'cancelled'] as const;
export type MeetingStatus = (typeof meetingStatuses)[number];

export interface SubscriptionLimits {
  workspaces: number;
  projectsPerWorkspace: number;
  teamMembers: number;
  storage: number; // in GB
  monthlyApiCalls: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    workspaces: 1,
    projectsPerWorkspace: 2,
    teamMembers: 5,
    storage: 1, // 1GB
    monthlyApiCalls: 10000,
  },
  pro: {
    workspaces: 10,
    projectsPerWorkspace: 50,
    teamMembers: 50,
    storage: 100, // 100GB
    monthlyApiCalls: 1000000,
  },
  enterprise: {
    workspaces: 999,
    projectsPerWorkspace: 999,
    teamMembers: 999,
    storage: 1000, // 1TB
    monthlyApiCalls: 100000000,
  }
};

export const viewTypes = ['dashboard', 'board', 'backlog', 'sprints', 'meetings', 'chat', 'analytics', 'docs', 'notifications', 'settings', 'admin', 'create-task', 'billing', 'project-settings', 'history'] as const;
export type ViewType = (typeof viewTypes)[number];

export type ChannelType = 'workspace' | 'project';

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

export interface TaskActivity {
  id: string;
  type: 'status_change' | 'assigned' | 'commented' | 'label_added' | 'label_removed' | 'priority_changed' | 'moved_to_sprint' | 'estimate_changed';
  userId: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  labels: string[];
  comments: Comment[];
  projectId: string;
  sprintId: string | null;
  backlogOrder: number;
  codeSnippets: CodeSnippet[];
  devNotes: string;
  
  // Professional features
  storyPoints?: number;
  timeEstimate?: number; // in hours
  timeSpent?: number; // in hours
  dueDate?: string;
  blockedBy?: string[]; // array of task IDs
  blockers?: string[]; // array of task IDs that this blocks
  activity?: TaskActivity[];
  attachments?: Attachment[];
  
  createdAt: string;
  updatedAt: string;
}

export interface ProjectColumn {
  id: string;
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
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Sprint {
  id: string;
  name: string;
  projectId: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  goal: string;
  
  // Professional features
  totalStoryPoints?: number;
  committedStoryPoints?: number;
  completedStoryPoints?: number;
  velocity?: number; // calculated from completed points
  capacity?: number; // max hours the team can take
  actualHours?: number;
  retrospective?: string;
  taskIds?: string[];
  
  createdAt?: string;
  updatedAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId?: string;
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
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  workspaceId: string;
  projectId?: string;
  organizerId: string;
  attendeeIds: string[];
  startAt: string;
  durationMinutes: number;
  meetingLink?: string;
  location?: string;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  relatedId: string;
}

export type NotificationType = 'task_assigned' | 'project_update' | 'mention' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  projectId: string;
  linkedTaskIds: string[];
  authorId: string;
  files?: DocumentFile[];
  updatedAt: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  color?: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  workspaceId: string;
  columns: BoardColumn[];
  createdBy: string;
  visibility: 'private' | 'team' | 'public';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider: 'google' | 'github' | 'apple' | 'email';
  role: MemberRole;
  subscriptionTier: SubscriptionTier;
  avatar: string;
  memberId?: string;
}

export type OAuthProvider = Exclude<AuthUser['provider'], 'email'>;
export type AuthMode = 'demo' | 'real';

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

export interface SeedData {
  workspaces: Workspace[];
  projects: Project[];
  sprints: Sprint[];
  tasks: Task[];
  members: Member[];
  meetings: Meeting[];
  messages: Message[];
  notifications: Notification[];
  documents: Document[];
  boards: Board[];
  channels: Channel[];
  activeWorkspaceId: string;
  activeProjectId: string;
  activeSprintId: string | null;
  activeView: ViewType;
}
