import { ObjectId } from 'mongodb';

export interface Account {
  _id?: ObjectId;
  id: string;
  name: string;
  email: string;
  provider: 'email' | 'google' | 'github' | 'apple';
  providerId?: string;
  role: 'owner' | 'admin' | 'member';
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  avatar: string;
  passwordHash?: string;
  twoFactorEnabled?: boolean;
  twoFactorOtpHash?: string | undefined;
  twoFactorOtpExpiresAt?: Date | undefined;
  passwordResetOtpHash?: string | undefined;
  passwordResetOtpExpiresAt?: Date | undefined;
  memberId: string;
  subscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  _id?: ObjectId;
  id: string;
  accountId: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trial';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentMethodId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  _id?: ObjectId;
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'inactive' | 'invited';
  joinedAt: Date;
}

export interface Workspace {
  _id?: ObjectId;
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  members?: Member[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  _id?: ObjectId;
  id: string;
  name: string;
  key: string;
  type: 'kanban' | 'scrum';
  workspaceId: string;
  memberIds: string[];
  description?: string;
  columns?: Column[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Column {
  id: string;
  title: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  color?: string;
}

export interface Board {
  _id?: ObjectId;
  id: string;
  name: string;
  description?: string;
  projectId: string;
  workspaceId: string;
  columns: BoardColumn[];
  createdBy: string;
  visibility: 'private' | 'team' | 'public';
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  _id?: ObjectId;
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
  assigneeId: string | null;
  labels: string[];
  sprintId: string | null;
  comments: TaskComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskComment {
  _id?: ObjectId;
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

export interface Sprint {
  _id?: ObjectId;
  id: string;
  projectId: string;
  name: string;
  status: 'planning' | 'active' | 'completed';
  startDate: Date;
  endDate: Date;
  goal: string;
  taskIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  _id?: ObjectId;
  id: string;
  workspaceId: string;
  projectId?: string;
  name: string;
  type: 'workspace' | 'project';
  description?: string;
  isPrivate?: boolean;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface Message {
  _id?: ObjectId;
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  threadParentId?: string | null;
  attachments?: {
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
  }[];
  reactions?: MessageReaction[];
  mentions?: string[];
  readBy?: string[];
  pinned?: boolean;
  editedAt?: Date | null;
  deletedAt?: Date | null;
  voiceUrl?: string;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DirectMessageRoom {
  _id?: ObjectId;
  id: string;
  memberIds: string[];
  lastMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileAttachment {
  _id?: ObjectId;
  id: string;
  messageId?: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: Date;
}

export interface DocumentFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface Document {
  _id?: ObjectId;
  id: string;
  projectId: string;
  title: string;
  content: string;
  files?: DocumentFile[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Invitation {
  _id?: ObjectId;
  id: string;
  workspaceId: string;
  projectId?: string;
  email: string;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}
