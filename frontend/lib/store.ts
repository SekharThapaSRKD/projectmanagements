import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  addTaskComment,
  createTeamFlowResource,
  deleteTeamFlowResource,
  fetchBootstrap,
  fetchMessages,
  isTeamFlowApiConfigured,
  sendTeamFlowMessage,
  subscribeToTeamFlowInvalidations,
  updateTeamFlowResource
} from './teamflow-api';
import { notificationService } from './notification-service';
import type {
  Channel,
  Comment,
  Document,
  Meeting,
  Member,
  Message,
  Notification,
  Priority,
  Project,
  ProjectType,
  SeedData,
  Sprint,
  Task,
  TaskStatus,
  ViewType,
  Workspace
} from './types';

type NewWorkspaceInput = {
  name: string;
  description?: string;
  memberIds?: string[];
};

type NewTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  type?: Task['type'];
  priority?: Priority;
  assigneeId?: string | null;
  labels?: string[];
  projectId?: string;
  sprintId?: string | null;
  devNotes?: string;
  codeSnippets?: Task['codeSnippets'];
  backlogOrder?: number;
  // Professional features
  storyPoints?: number;
  timeEstimate?: number;
  dueDate?: string;
  blockedBy?: string[];
};

type NewProjectInput = {
  name: string;
  type: ProjectType;
  workspaceId?: string;
  description?: string;
  memberIds?: string[];
};

type NewSprintInput = {
  name: string;
  projectId?: string;
  startDate: string;
  endDate: string;
  goal: string;
};

type NewDocumentInput = {
  title: string;
  content?: string;
  projectId?: string;
  linkedTaskIds?: string[];
  authorId?: string;
};

type NewMemberInput = {
  name: string;
  email: string;
  role?: Member['role'];
  status?: Member['status'];
};

type NewMeetingInput = {
  title: string;
  description?: string;
  startAt: string;
  durationMinutes?: number;
  workspaceId?: string;
  projectId?: string;
  attendeeIds?: string[];
  meetingLink?: string;
  location?: string;
};

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info';
  actions?: Array<{
    label: string;
    onClick?: () => void;
    variant?: 'default' | 'secondary' | 'destructive';
    keepOpen?: boolean;
  }>;
  durationMs?: number;
}

interface AppState extends SeedData {
  sidebarOpen: boolean;
  chatOpen: boolean;
  activeChannelId: string;
  activeAdminTab: 'members' | 'roles' | 'workspace' | 'projects' | 'billing' | 'history' | 'danger';
  toasts: Toast[];
  setActiveWorkspace: (workspaceId: string) => void;
  setActiveProject: (projectId: string) => void;
  setActiveSprint: (sprintId: string | null) => void;
  setActiveView: (view: ViewType) => void;
  setActiveAdminTab: (tab: 'members' | 'roles' | 'workspace' | 'projects' | 'billing' | 'history' | 'danger') => void;
  setActiveChannel: (channelId: string) => void;
  toggleSidebar: () => void;
  toggleChat: () => void;
  addWorkspace: (input: NewWorkspaceInput) => Promise<string>;
  addTask: (input: NewTaskInput) => string;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, status: TaskStatus) => void;
  addComment: (taskId: string, content: string, authorId?: string) => void;
  addProject: (input: NewProjectInput) => string;
  joinProject: (projectKey: string, memberId: string) => void;
  updateProject: (projectId: string, patch: Partial<Project>) => void;
  deleteProject: (projectId: string, permanent?: boolean) => void;
  restoreProject: (projectId: string) => void;
  permanentlyDeleteProject: (projectId: string) => void;
  addBoard: (name: string, description: string, projectId: string, columns: Array<{ name: string; color?: string }>, visibility: 'private' | 'team' | 'public') => string;
  updateBoard: (boardId: string, patch: Partial<any>) => void;
  deleteBoard: (boardId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  addSprint: (input: NewSprintInput) => string;
  updateSprint: (sprintId: string, patch: Partial<Sprint>) => void;
  deleteSprint: (sprintId: string) => void;
  deleteSprintWithTasks: (sprintId: string) => void;
  startSprint: (sprintId: string) => void;
  completeSprint: (sprintId: string) => void;
  addTaskToSprint: (taskId: string, sprintId: string) => void;
  removeTaskFromSprint: (taskId: string) => void;
  addChannel: (name: string, projectId?: string) => string;
  sendMessage: (content: string, channelId?: string, senderId?: string, voiceUrl?: string, duration?: number, attachments?: Array<{ id: string; name: string; url: string; size: number; type: string }>) => void;
  addMeeting: (input: NewMeetingInput) => string;
  updateMeeting: (meetingId: string, patch: Partial<Meeting>) => void;
  deleteMeeting: (meetingId: string) => void;
  addDocument: (input: NewDocumentInput) => string;
  updateDocument: (documentId: string, patch: Partial<Document>) => void;
  deleteDocument: (documentId: string) => void;
  updateMember: (memberId: string, patch: Partial<Member>) => void;
  removeMember: (memberId: string) => void;
  addMember: (input: NewMemberInput) => string;
  updateWorkspace: (workspaceId: string, patch: Partial<Workspace>) => void;
  hydrateFromBackend: () => Promise<void>;
  hydrateMessages: (channelId: string) => Promise<void>;
  startRealtimeSync: () => () => void;
  resetAppData: () => void;
  resetAllData: () => void;
}

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

const createTask = (input: NewTaskInput, projectId: string): Task => {
  const status = input.status ?? 'todo';
  const now = new Date().toISOString();

  return {
    id: makeId('task'),
    title: input.title,
    description: input.description ?? '',
    status,
    type: input.type ?? 'task',
    priority: input.priority ?? 'medium',
    assigneeId: input.assigneeId ?? null,
    labels: input.labels ?? [],
    comments: [],
    projectId,
    sprintId: input.sprintId ?? null,
    codeSnippets: input.codeSnippets ?? [],
    devNotes: input.devNotes ?? '',
    backlogOrder: input.backlogOrder ?? 0,
    createdAt: now,
    updatedAt: now
  };
};

const createProjectColumns = (type: ProjectType) =>
  type === 'scrum'
    ? [
        { id: 'backlog' as const, title: 'Backlog' },
        { id: 'todo' as const, title: 'Selected' },
        { id: 'in_progress' as const, title: 'In Progress' },
        { id: 'in_review' as const, title: 'Review' },
        { id: 'done' as const, title: 'Done' }
      ]
    : [
        { id: 'todo' as const, title: 'Todo' },
        { id: 'in_progress' as const, title: 'In Progress' },
        { id: 'in_review' as const, title: 'In Review' },
        { id: 'done' as const, title: 'Done' }
      ];

  const createEmptySeedData = (): SeedData => ({
    workspaces: [],
    projects: [],
    sprints: [],
    tasks: [],
    members: [],
    meetings: [],
    messages: [],
    notifications: [],
    documents: [],
    boards: [],
    channels: [],
    activeWorkspaceId: '',
    activeProjectId: '',
    activeSprintId: null,
    activeView: 'dashboard'
  });

const mergeBootstrapState = (state: SeedData, bootstrap: Partial<SeedData>) => ({
  ...state,
  workspaces: bootstrap.workspaces ?? state.workspaces,
  projects: bootstrap.projects ?? state.projects,
  sprints: bootstrap.sprints ?? state.sprints,
  tasks: bootstrap.tasks ?? state.tasks,
  members: bootstrap.members ?? state.members,
  messages: bootstrap.messages ?? state.messages,
  meetings: bootstrap.meetings ?? state.meetings,
  documents: bootstrap.documents ?? state.documents,
  channels: bootstrap.channels ?? state.channels,
  activeWorkspaceId: bootstrap.activeWorkspaceId ?? state.activeWorkspaceId,
  activeProjectId: bootstrap.activeProjectId ?? state.activeProjectId,
  activeSprintId: bootstrap.activeSprintId ?? state.activeSprintId,
  activeView: bootstrap.activeView ?? state.activeView
});

const syncIfReal = async <T>(work: () => Promise<T>) => {
  if (!isTeamFlowApiConfigured()) {
    return null;
  }

  try {
    return await work();
  } catch {
    return null;
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...createEmptySeedData(),
      sidebarOpen: true,
      chatOpen: true,
      activeChannelId: '',
      activeAdminTab: 'members',
      toasts: [],
      setActiveWorkspace: workspaceId => {
        set(state => {
          const nextProject = state.projects.find(project => project.workspaceId === workspaceId) ?? state.projects[0];
          const nextChannel = state.channels.find(channel => channel.type === 'project' && channel.relatedId === nextProject?.id) ?? state.channels.find(channel => channel.type === 'workspace' && channel.relatedId === workspaceId) ?? state.channels[0];

          return {
            activeWorkspaceId: workspaceId,
            activeProjectId: nextProject?.id ?? state.activeProjectId,
            activeChannelId: nextChannel?.id ?? state.activeChannelId,
            activeSprintId: state.sprints.find(sprint => sprint.projectId === nextProject?.id)?.id ?? null
          };
        });
      },
      setActiveProject: projectId => {
        set(state => {
          const nextProject = state.projects.find(project => project.id === projectId) ?? state.projects[0];
          const nextChannel = state.channels.find(channel => channel.type === 'project' && channel.relatedId === nextProject?.id) ?? state.channels.find(channel => channel.type === 'workspace' && channel.relatedId === state.activeWorkspaceId) ?? state.channels[0];

          return {
            activeProjectId: projectId,
            activeSprintId: state.sprints.find(sprint => sprint.projectId === projectId && sprint.status === 'active')?.id ?? state.activeSprintId,
            activeChannelId: nextChannel?.id ?? state.activeChannelId
          };
        });
      },
      setActiveSprint: sprintId => set({ activeSprintId: sprintId }),
      setActiveView: view => set({ activeView: view }),
      setActiveAdminTab: tab => set({ activeAdminTab: tab, activeView: 'admin' }),
      setActiveChannel: channelId => set({ activeChannelId: channelId }),
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      toggleChat: () => set(state => ({ chatOpen: !state.chatOpen })),
      addWorkspace: async input => {
        const workspaceId = makeId('ws');
        const workspace: Workspace = {
          id: workspaceId,
          name: input.name,
          description: input.description ?? '',
          memberIds: input.memberIds ?? []
        };
        const workspaceChannel: Channel = {
          id: makeId('channel'),
          name: `#${workspace.name.replace(/[^a-z0-9]+/gi, '').toLowerCase()}`,
          type: 'workspace',
          relatedId: workspace.id
        };

        if (isTeamFlowApiConfigured()) {
          try {
            const created = await createTeamFlowResource<Workspace>('workspaces', input);
            set(state => ({
              workspaces: [created, ...state.workspaces],
              channels: [workspaceChannel, ...state.channels], // Channels are created on backend usually? Let's keep local sync for now
              activeWorkspaceId: created.id,
              activeChannelId: workspaceChannel.id
            }));
            return created.id;
          } catch (error) {
            console.error('Failed to create workspace on backend:', error);
            throw error;
          }
        }

        set(state => ({
          workspaces: [workspace, ...state.workspaces],
          channels: [workspaceChannel, ...state.channels],
          activeWorkspaceId: workspace.id,
          activeChannelId: workspaceChannel.id
        }));
        return workspace.id;
      },
      addTask: input => {
        const projectId = input.projectId ?? get().activeProjectId;
        const task = createTask(input, projectId);
        
        set(state => ({ tasks: [task, ...state.tasks] }));

        // Notify assignee
        if (task.assigneeId) {
          const assignee = get().members.find(m => m.id === task.assigneeId);
          if (assignee) {
            get().addNotification({
              type: 'task_assigned',
              title: 'New Task Assigned',
              message: `You have been assigned to: ${task.title}`,
              link: task.id
            });
          }
        }

        void syncIfReal(() => createTeamFlowResource('tasks', { ...input, projectId }));
        return task.id;
      },
      updateTask: (taskId, patch) =>
        set(state => {
          const currentTask = state.tasks.find(task => task.id === taskId);
          if (currentTask) {
            // Check for new assignment
            if (patch.assigneeId && patch.assigneeId !== currentTask.assigneeId) {
              const assignee = get().members.find(m => m.id === patch.assigneeId);
              if (assignee) {
                get().addNotification({
                  type: 'task_assigned',
                  title: 'Task Reassigned',
                  message: `You are now responsible for: ${currentTask.title}`,
                  link: taskId
                });
              }
            }

            void syncIfReal(() => updateTeamFlowResource('tasks', taskId, { ...currentTask, ...patch }));
          }

          return {
            tasks: state.tasks.map(task => (task.id === taskId ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task))
          };
        }),
      deleteTask: taskId => {
        set(state => ({ tasks: state.tasks.filter(task => task.id !== taskId) }));
        void syncIfReal(() => deleteTeamFlowResource('tasks', taskId));
      },
      moveTask: (taskId, status) =>
        set(state => {
          const task = state.tasks.find(item => item.id === taskId);
          if (task) {
            void syncIfReal(() => updateTeamFlowResource('tasks', taskId, { ...task, status }));
          }

          return {
            tasks: state.tasks.map(current => (current.id === taskId ? { ...current, status, updatedAt: new Date().toISOString() } : current))
          };
        }),
      addComment: (taskId, content, authorId = 'mem_olivia') =>
        set(state => {
          void syncIfReal(() => addTaskComment(taskId, content, authorId));

          return {
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    comments: [
                      ...task.comments,
                      {
                        id: makeId('comment'),
                        content,
                        authorId,
                        createdAt: new Date().toISOString()
                      } satisfies Comment
                    ],
                    updatedAt: new Date().toISOString()
                  }
                : task
            )
          };
        }),
      addProject: input => {
        const project: Project = {
          id: makeId('project'),
          name: input.name,
          key: input.name.replace(/[^a-z0-9]+/gi, '').slice(0, 3).toUpperCase(),
          type: input.type,
          workspaceId: input.workspaceId ?? get().activeWorkspaceId,
          columns: createProjectColumns(input.type),
          memberIds: input.memberIds ?? get().workspaces.find(workspace => workspace.id === (input.workspaceId ?? get().activeWorkspaceId))?.memberIds ?? [],
          description: input.description ?? ''
        };

        const projectChannel: Channel = {
          id: makeId('channel'),
          name: `#${project.key.toLowerCase()}`,
          type: 'project',
          relatedId: project.id
        };

        set(state => ({
          projects: [project, ...state.projects],
          channels: [projectChannel, ...state.channels],
          activeProjectId: project.id,
          activeChannelId: projectChannel.id,
          activeView: 'board'
        }));

        void syncIfReal(() => createTeamFlowResource('projects', { ...input, workspaceId: project.workspaceId }));

        return project.id;
      },
      joinProject: (projectKey, memberId) => {
        const project = get().projects.find(p => p.key.toLowerCase() === projectKey.toLowerCase());
        if (!project) throw new Error('Project not found');
        
        if (project.memberIds.includes(memberId)) {
          throw new Error('You have already joined this project');
        }

        const nextMemberIds = [...project.memberIds, memberId];
        const projectChannel: Channel = {
          id: makeId('channel'),
          name: `#${project.key.replace(/[^a-z0-9]+/gi, '').toLowerCase()}`,
          type: 'project',
          relatedId: project.id
        };

        set(state => ({
          projects: state.projects.map(p => p.id === project.id ? { ...p, memberIds: nextMemberIds } : p),
          channels: [projectChannel, ...state.channels.filter(c => !(c.type === 'project' && c.relatedId === project.id))],
          activeWorkspaceId: project.workspaceId ?? state.activeWorkspaceId,
          activeProjectId: project.id,
          activeChannelId: projectChannel.id,
          activeView: 'board'
        }));
        
        void syncIfReal(() => updateTeamFlowResource('projects', project.id, { ...project, memberIds: nextMemberIds }));
      },
      deleteProject: (projectId, permanent = false) =>
        set(state => {
          if (permanent) {
            void syncIfReal(() => deleteTeamFlowResource('projects', projectId));
            return {
              projects: state.projects.filter(p => p.id !== projectId),
              channels: state.channels.filter(c => c.type !== 'project' || c.relatedId !== projectId),
              tasks: state.tasks.filter(t => t.projectId !== projectId),
              activeProjectId: state.activeProjectId === projectId ? state.projects.find(p => p.id !== projectId && !p.isDeleted)?.id || '' : state.activeProjectId
            };
          }

          const updatedProjects = state.projects.map(p => p.id === projectId ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p);
          const projectToUpdate = updatedProjects.find(p => p.id === projectId);
          
          if (projectToUpdate) {
            void syncIfReal(() => updateTeamFlowResource('projects', projectId, projectToUpdate));
          }

          return {
            projects: updatedProjects,
            activeProjectId: state.activeProjectId === projectId ? state.projects.find(p => p.id !== projectId && !p.isDeleted)?.id || '' : state.activeProjectId
          };
        }),
      restoreProject: projectId =>
        set(state => {
          const updatedProjects = state.projects.map(p => p.id === projectId ? { ...p, isDeleted: false, deletedAt: undefined } : p);
          const projectToUpdate = updatedProjects.find(p => p.id === projectId);
          
          if (projectToUpdate) {
            void syncIfReal(() => updateTeamFlowResource('projects', projectId, projectToUpdate));
          }

          return { projects: updatedProjects };
        }),
      permanentlyDeleteProject: projectId => get().deleteProject(projectId, true),
      markNotificationRead: (notificationId) => {
        set(state => ({
          notifications: state.notifications.map(n => n.id === notificationId ? { ...n, read: true } : n)
        }));
      },
      clearNotifications: () => {
        set({ notifications: [] });
      },
      addToast: (toast) => {
        const id = makeId('toast');
        set(state => ({
          toasts: [...state.toasts, { ...toast, id }]
        }));
        const timeout = toast.durationMs ?? (toast.actions?.length ? 8000 : 3000);
        if (timeout > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, timeout);
        }
      },
      removeToast: (id) => {
        set(state => ({
          toasts: state.toasts.filter(t => t.id !== id)
        }));
      },
      addNotification: (notif) => {
        const notification: Notification = {
          ...notif,
          id: makeId('notif'),
          createdAt: new Date().toISOString(),
          read: false
        };
        set(state => ({
          notifications: [notification, ...state.notifications]
        }));

        // Play in-app sound for newly created notifications.
        void notificationService.playSound();
        
        // Trigger browser push notification
        void notificationService.show(notification.title, {
          body: notification.message,
          tag: notification.id
        });
      },
      updateProject: (projectId, patch) =>
        set(state => {
          const project = state.projects.find(item => item.id === projectId);
          if (project) {
            void syncIfReal(() => updateTeamFlowResource('projects', projectId, { ...project, ...patch }));
          }

          return {
            projects: state.projects.map(current => (current.id === projectId ? { ...current, ...patch } : current))
          };
        }),
      addSprint: input => {
        const sprint: Sprint = {
          id: makeId('sprint'),
          name: input.name,
          projectId: input.projectId ?? get().activeProjectId,
          startDate: input.startDate,
          endDate: input.endDate,
          status: 'planning',
          goal: input.goal
        };

        set(state => ({ sprints: [sprint, ...state.sprints] }));
        void syncIfReal(() => createTeamFlowResource('sprints', { ...input, projectId: sprint.projectId }));
        return sprint.id;
      },
      updateSprint: (sprintId, patch) =>
        set(state => {
          const sprint = state.sprints.find(item => item.id === sprintId);
          if (sprint) {
            void syncIfReal(() => updateTeamFlowResource('sprints', sprintId, { ...sprint, ...patch }));
          }

          return {
            sprints: state.sprints.map(current =>
              current.id === sprintId ? { ...current, ...patch, updatedAt: new Date().toISOString() } : current
            )
          };
        }),
      startSprint: sprintId =>
        set(state => {
          const sprint = state.sprints.find(item => item.id === sprintId);
          if (sprint) {
            void syncIfReal(() => updateTeamFlowResource('sprints', sprintId, { ...sprint, status: 'active' }));
          }

          return {
            sprints: state.sprints.map(current => (current.id === sprintId ? { ...current, status: 'active' } : current)),
            activeSprintId: sprintId
          };
        }),
      completeSprint: sprintId =>
        set(state => {
          const sprint = state.sprints.find(item => item.id === sprintId);
          if (sprint) {
            void syncIfReal(() => updateTeamFlowResource('sprints', sprintId, { ...sprint, status: 'completed' }));
          }

          return {
            sprints: state.sprints.map(current => (current.id === sprintId ? { ...current, status: 'completed' } : current)),
            activeSprintId: state.activeSprintId === sprintId ? null : state.activeSprintId
          };
        }),
      addTaskToSprint: (taskId, sprintId) =>
        set(state => {
          const task = state.tasks.find(item => item.id === taskId);
          if (task) {
            void syncIfReal(() => updateTeamFlowResource('tasks', taskId, { ...task, sprintId }));
          }

          return {
            tasks: state.tasks.map(current => (current.id === taskId ? { ...current, sprintId, updatedAt: new Date().toISOString() } : current))
          };
        }),
      removeTaskFromSprint: taskId =>
        set(state => {
          const task = state.tasks.find(item => item.id === taskId);
          if (task) {
            void syncIfReal(() => updateTeamFlowResource('tasks', taskId, { ...task, sprintId: null }));
          }

          return {
            tasks: state.tasks.map(current => (current.id === taskId ? { ...current, sprintId: null, updatedAt: new Date().toISOString() } : current))
          };
        }),
      deleteSprint: sprintId =>
        set(state => {
          const sprint = state.sprints.find(item => item.id === sprintId);
          if (sprint) {
            void syncIfReal(() => deleteTeamFlowResource('sprints', sprintId));
          }

          return {
            sprints: state.sprints.filter(s => s.id !== sprintId),
            tasks: state.tasks.map(t => (t.sprintId === sprintId ? { ...t, sprintId: null, updatedAt: new Date().toISOString() } : t)),
            activeSprintId: state.activeSprintId === sprintId ? null : state.activeSprintId
          };
        }),
          deleteSprintWithTasks: sprintId =>
            set(state => {
              const sprint = state.sprints.find(item => item.id === sprintId);
              if (sprint) {
                void syncIfReal(async () => {
                  // delete sprint on backend
                  await deleteTeamFlowResource('sprints', sprintId);
                  // delete tasks that belonged to this sprint
                  const sprintTasks = state.tasks.filter(t => t.sprintId === sprintId);
                  for (const t of sprintTasks) {
                    try {
                      await deleteTeamFlowResource('tasks', t.id);
                    } catch {
                      // ignore individual failures
                    }
                  }
                });
              }

              return {
                sprints: state.sprints.filter(s => s.id !== sprintId),
                tasks: state.tasks.filter(t => t.sprintId !== sprintId),
                activeSprintId: state.activeSprintId === sprintId ? null : state.activeSprintId
              };
            }),
      addChannel: (name, projectId) => {
        const pId = projectId ?? get().activeProjectId;
        if (!pId) throw new Error('No project selected');
        
        const channel: Channel = {
          id: makeId('channel'),
          name: `#${name.replace(/[^a-z0-9]+/gi, '').toLowerCase()}`,
          type: 'project',
          relatedId: pId
        };
        
        set(state => ({
          channels: [channel, ...state.channels],
          activeChannelId: channel.id
        }));
        
        void syncIfReal(() => createTeamFlowResource('channels', channel));
        return channel.id;
      },
      sendMessage: (content, channelId = get().activeChannelId, senderId = 'mem_olivia', voiceUrl, duration, attachments) =>
        set(state => {
          const message: Message = {
            id: makeId('msg'),
            content,
            senderId,
            channelId,
            createdAt: new Date().toISOString(),
            ...(voiceUrl && { voiceUrl, duration }),
            ...(attachments && attachments.length > 0 && { attachments })
          };
          void syncIfReal(() => sendTeamFlowMessage(content, channelId, senderId));

          return {
            messages: [message, ...state.messages]
          };
        }),
      addMeeting: input => {
        const now = new Date().toISOString();
        const meeting: Meeting = {
          id: makeId('meet'),
          title: input.title,
          description: input.description,
          workspaceId: input.workspaceId ?? get().activeWorkspaceId,
          projectId: input.projectId,
          organizerId: get().members[0]?.id ?? 'mem_olivia',
          attendeeIds: input.attendeeIds ?? [],
          startAt: input.startAt,
          durationMinutes: input.durationMinutes ?? 30,
          meetingLink: input.meetingLink,
          location: input.location,
          status: 'scheduled',
          createdAt: now,
          updatedAt: now
        };

        set(state => ({ meetings: [meeting, ...state.meetings] }));
        get().addNotification({
          type: 'system',
          title: 'Meeting Created',
          message: `${meeting.title} is scheduled.`
        });

        return meeting.id;
      },
      updateMeeting: (meetingId, patch) =>
        set(state => ({
          meetings: state.meetings.map(meeting =>
            meeting.id === meetingId ? { ...meeting, ...patch, updatedAt: new Date().toISOString() } : meeting
          )
        })),
      deleteMeeting: meetingId =>
        set(state => ({ meetings: state.meetings.filter(meeting => meeting.id !== meetingId) })),
      addDocument: input => {
        const document: Document = {
          id: makeId('doc'),
          title: input.title,
          content: input.content ?? '# Untitled document\n\nStart writing here.',
          projectId: input.projectId ?? get().activeProjectId,
          linkedTaskIds: input.linkedTaskIds ?? [],
          authorId: input.authorId ?? 'mem_olivia',
          updatedAt: new Date().toISOString()
        };

        set(state => ({ documents: [document, ...state.documents] }));
        void syncIfReal(() => createTeamFlowResource('documents', document));
        return document.id;
      },
      updateDocument: (documentId, patch) =>
        set(state => {
          const document = state.documents.find(item => item.id === documentId);
          if (document) {
            void syncIfReal(() => updateTeamFlowResource('documents', documentId, { ...document, ...patch }));
          }

          return {
            documents: state.documents.map(current =>
              current.id === documentId ? { ...current, ...patch, updatedAt: new Date().toISOString() } : current
            )
          };
        }),
      deleteDocument: documentId => {
        set(state => ({ documents: state.documents.filter(document => document.id !== documentId) }));
        void syncIfReal(() => deleteTeamFlowResource('documents', documentId));
      },
      updateMember: (memberId, patch) =>
        set(state => {
          const member = state.members.find(item => item.id === memberId);
          if (member) {
            void syncIfReal(() => updateTeamFlowResource('members', memberId, { ...member, ...patch }));
          }

          return {
            members: state.members.map(current => (current.id === memberId ? { ...current, ...patch } : current))
          };
        }),
      removeMember: memberId =>
        set(state => {
          void syncIfReal(() => deleteTeamFlowResource('members', memberId));

          return {
            members: state.members.filter(member => member.id !== memberId),
            workspaces: state.workspaces.map(workspace => ({
              ...workspace,
              memberIds: workspace.memberIds.filter(id => id !== memberId)
            })),
            projects: state.projects.map(project => ({
              ...project,
              memberIds: project.memberIds.filter(id => id !== memberId)
            }))
          };
        }),
      addMember: input => {
        const member: Member = {
          id: makeId('member'),
          name: input.name,
          email: input.email,
          avatar: input.name
            .split(' ')
            .map(part => part.slice(0, 1))
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          role: input.role ?? 'developer',
          status: input.status ?? 'offline',
          joinedAt: new Date().toISOString()
        };

        set(state => ({
          members: [member, ...state.members],
          workspaces: state.workspaces.map(workspace => ({
            ...workspace,
            memberIds: workspace.id === state.activeWorkspaceId ? [member.id, ...workspace.memberIds] : workspace.memberIds
          })),
          projects: state.projects.map(project => ({
            ...project,
            memberIds: project.workspaceId === state.activeWorkspaceId ? [member.id, ...project.memberIds] : project.memberIds
          }))
        }));

        void syncIfReal(() => createTeamFlowResource('members', member));

        return member.id;
      },
      updateWorkspace: (workspaceId, patch) =>
        set(state => {
          const workspace = state.workspaces.find(item => item.id === workspaceId);
          if (workspace) {
            void syncIfReal(() => updateTeamFlowResource('workspaces', workspaceId, { ...workspace, ...patch }));
          }

          return {
            workspaces: state.workspaces.map(current => (current.id === workspaceId ? { ...current, ...patch } : current))
          };
        }),
      hydrateFromBackend: async () => {
        if (!isTeamFlowApiConfigured()) {
          return;
        }

        try {
          const state = get();
          const bootstrap = await fetchBootstrap(state.activeWorkspaceId, state.activeProjectId, state.activeChannelId);
          set(state => mergeBootstrapState(state, bootstrap));
        } catch (error: any) {
          const message = error?.message ?? '';

          // Session might be stale after refresh; avoid noisy logs for expected auth failures.
          if (message.includes('Unauthorized') || message.includes('401')) {
            return;
          }

          // If access is denied to the stored workspace, retry without workspace/project/channel IDs
          // to let the backend pick the first available workspace
          if (message.includes('Access denied') || message.includes('403')) {
            console.warn('Stored workspace is no longer accessible, falling back to first available');
            try {
              const bootstrap = await fetchBootstrap(undefined, undefined, undefined);
              set(state => mergeBootstrapState(state, bootstrap));
            } catch (retryError) {
              console.error('Failed to hydrate after fallback:', retryError);
            }
          } else {
            console.error('Failed to hydrate from backend:', error);
          }
        }
      },
      hydrateMessages: async (channelId: string) => {
        if (!isTeamFlowApiConfigured()) {
          return;
        }
        const channelMessages = await fetchMessages(channelId);
        set(state => {
          // Remove old messages for this channel and append the newly fetched ones
          const otherMessages = state.messages.filter(m => m.channelId !== channelId);
          return { messages: [...channelMessages, ...otherMessages] };
        });
      },      addBoard: (name, description, projectId, columns, visibility) => {
        const now = new Date().toISOString();
        const boardId = makeId('board');
        const newBoard = {
          id: boardId,
          name,
          description,
          projectId,
          workspaceId: get().projects.find(p => p.id === projectId)?.workspaceId || '',
          columns: columns.map((col, idx) => ({
            id: `col_${idx}`,
            name: col.name,
            color: col.color
          })),
          createdBy: '', // Will be set by backend
          visibility,
          tags: [],
          createdAt: now,
          updatedAt: now
        };
        
        set(state => ({
          boards: [...state.boards, newBoard]
        }));
        
        void syncIfReal(() => createTeamFlowResource('boards', newBoard));
        return boardId;
      },
      updateBoard: (boardId, patch) => {
        set(state => ({
          boards: state.boards.map(b => b.id === boardId ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b)
        }));
        
        void syncIfReal(async () => {
          const board = get().boards.find(b => b.id === boardId);
          if (board) {
            await updateTeamFlowResource('boards', boardId, board);
          }
        });
      },
      deleteBoard: (boardId) => {
        set(state => ({
          boards: state.boards.filter(b => b.id !== boardId)
        }));
        
        void syncIfReal(() => deleteTeamFlowResource('boards', boardId));
      },
      startRealtimeSync: () => {
        const unsubscribe = subscribeToTeamFlowInvalidations(
          () => {
            void get().hydrateFromBackend();
          },
          (event) => {
            if (!event || !event.type) return;
            if (event.type === 'message:created' && event.data) {
              set(state => ({ messages: [event.data, ...state.messages] }));
              return;
            }
            if (event.type === 'state.invalidated') {
              void get().hydrateFromBackend();
            }
          }
        );

        return unsubscribe;
      },
      resetAppData: () =>
        set(() => ({
          ...createEmptySeedData(),
          sidebarOpen: true,
          chatOpen: true,
          activeChannelId: ''
        })),
      resetAllData: () => {
        localStorage.removeItem('teamflow-storage');
        localStorage.removeItem('teamflow-auth');
        window.location.reload();
      }
    }),
    {
      name: 'teamflow-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        workspaces: state.workspaces,
        projects: state.projects,
        sprints: state.sprints,
        tasks: state.tasks,
        members: state.members,
        meetings: state.meetings,
        messages: state.messages,
        documents: state.documents,
        boards: state.boards,
        channels: state.channels,
        activeWorkspaceId: state.activeWorkspaceId,
        activeProjectId: state.activeProjectId,
        activeSprintId: state.activeSprintId,
        activeView: state.activeView,
        activeAdminTab: state.activeAdminTab,
        sidebarOpen: state.sidebarOpen,
        chatOpen: state.chatOpen,
        activeChannelId: state.activeChannelId
      }),
      onRehydrateStorage: () => state => {
        if (!state) {
          return;
        }

        state.projects = (state.projects ?? []).map(project => ({
          ...project,
          memberIds: Array.isArray(project.memberIds) ? project.memberIds : [],
          columns: Array.isArray(project.columns) ? project.columns : []
        }));

        state.workspaces = (state.workspaces ?? []).map(workspace => ({
          ...workspace,
          memberIds: Array.isArray(workspace.memberIds) ? workspace.memberIds : []
        }));

        state.members = Array.isArray(state.members) ? state.members : [];
        state.meetings = Array.isArray(state.meetings) ? state.meetings : [];
        state.boards = Array.isArray(state.boards) ? state.boards : [];
      }
    }
  )
);