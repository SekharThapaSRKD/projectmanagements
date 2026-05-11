import bcrypt from 'bcryptjs';
import type { TeamFlowState } from './types.js';

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
const hash = async (value: string) => bcrypt.hash(value, 10);

export const createSeedState = async (): Promise<TeamFlowState> => {
  const demoPasswordHash = await hash('password');

  return {
    accounts: [
      {
        id: 'acct_demo_owner',
        name: 'Olivia Carter',
        email: 'demo@teamflow.run',
        provider: 'email',
        role: 'owner',
        avatar: 'OC',
        passwordHash: demoPasswordHash,
        memberId: 'mem_olivia',
        createdAt: daysAgo(45),
        updatedAt: daysAgo(1)
      }
    ],
    workspaces: [
      {
        id: 'ws_teamflow',
        name: 'TeamFlow HQ',
        description: 'Product, design, and engineering workspace',
        memberIds: ['mem_olivia', 'mem_mason', 'mem_ava', 'mem_noah', 'mem_emma']
      }
    ],
    projects: [
      {
        id: 'proj_launchpad',
        name: 'Launchpad',
        key: 'LP',
        type: 'kanban',
        workspaceId: 'ws_teamflow',
        columns: [
          { id: 'todo', title: 'Todo' },
          { id: 'in_progress', title: 'In Progress' },
          { id: 'in_review', title: 'In Review' },
          { id: 'done', title: 'Done' }
        ],
        memberIds: ['mem_olivia', 'mem_mason', 'mem_ava'],
        description: 'Customer-facing launch work'
      },
      {
        id: 'proj_sprintcore',
        name: 'SprintCore',
        key: 'SC',
        type: 'scrum',
        workspaceId: 'ws_teamflow',
        columns: [
          { id: 'backlog', title: 'Backlog' },
          { id: 'todo', title: 'Selected' },
          { id: 'in_progress', title: 'In Progress' },
          { id: 'in_review', title: 'Review' },
          { id: 'done', title: 'Done' }
        ],
        memberIds: ['mem_mason', 'mem_ava', 'mem_noah'],
        description: 'Scrum delivery for platform improvements'
      }
    ],
    sprints: [
      {
        id: 'sprint_alpha',
        name: 'Sprint Alpha',
        projectId: 'proj_sprintcore',
        startDate: daysAgo(4),
        endDate: daysAgo(-10),
        status: 'active',
        goal: 'Stabilize task flows and release analytics improvements'
      },
      {
        id: 'sprint_beta',
        name: 'Sprint Beta',
        projectId: 'proj_sprintcore',
        startDate: daysAgo(-14),
        endDate: daysAgo(-1),
        status: 'planning',
        goal: 'Polish collaboration tools'
      }
    ],
    tasks: [
      {
        id: 'task_board',
        title: 'Refine kanban swimlanes',
        description: 'Improve visual separation and drag feedback on the board.',
        status: 'in_progress',
        priority: 'high',
        assigneeId: 'mem_mason',
        labels: ['ui', 'board'],
        comments: [
          {
            id: 'comment_1',
            content: 'Need a stronger drop highlight for mobile drag gestures.',
            authorId: 'mem_olivia',
            createdAt: daysAgo(2)
          }
        ],
        projectId: 'proj_launchpad',
        sprintId: null,
        codeSnippets: [
          {
            id: 'snippet_1',
            language: 'tsx',
            code: 'const columns = tasksByStatus.map(status => ({ status, tasks: tasks.filter(task => task.status === status) }));',
            filename: 'kanban-board.tsx'
          }
        ],
        devNotes: 'Keep animations subtle and make the drop target obvious.',
        createdAt: daysAgo(6),
        updatedAt: daysAgo(1)
      },
      {
        id: 'task_docs',
        title: 'Draft product release notes',
        description: 'Write markdown release notes for the current sprint.',
        status: 'todo',
        priority: 'medium',
        assigneeId: 'mem_ava',
        labels: ['docs', 'launch'],
        comments: [],
        projectId: 'proj_launchpad',
        sprintId: null,
        codeSnippets: [],
        devNotes: '',
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3)
      },
      {
        id: 'task_chat',
        title: 'Group chat quick reactions',
        description: 'Support fast emoji reactions and better message grouping.',
        status: 'backlog',
        priority: 'low',
        assigneeId: 'mem_noah',
        labels: ['chat', 'ux'],
        comments: [],
        projectId: 'proj_sprintcore',
        sprintId: 'sprint_alpha',
        codeSnippets: [],
        devNotes: 'Can piggyback on the message list before the backend exists.',
        createdAt: daysAgo(5),
        updatedAt: daysAgo(5)
      },
      {
        id: 'task_metrics',
        title: 'Burndown chart calibration',
        description: 'Tune the analytics data to show realistic sprint progress.',
        status: 'in_review',
        priority: 'urgent',
        assigneeId: 'mem_olivia',
        labels: ['analytics'],
        comments: [],
        projectId: 'proj_sprintcore',
        sprintId: 'sprint_alpha',
        codeSnippets: [],
        devNotes: 'Validate zero-task and completed-sprint cases.',
        createdAt: daysAgo(8),
        updatedAt: daysAgo(1)
      },
      {
        id: 'task_done',
        title: 'Theme switch persistence',
        description: 'Remember dark/light preference between sessions.',
        status: 'done',
        priority: 'medium',
        assigneeId: 'mem_ava',
        labels: ['theme', 'settings'],
        comments: [],
        projectId: 'proj_sprintcore',
        sprintId: 'sprint_alpha',
        codeSnippets: [],
        devNotes: 'ThemeProvider wraps the whole app layout.',
        createdAt: daysAgo(10),
        updatedAt: daysAgo(1)
      },
      {
        id: 'task_backlog',
        title: 'Admin panel settings shell',
        description: 'Add a permissions-aware admin settings page.',
        status: 'backlog',
        priority: 'high',
        assigneeId: null,
        labels: ['rbac', 'admin'],
        comments: [],
        projectId: 'proj_sprintcore',
        sprintId: null,
        codeSnippets: [],
        devNotes: 'Use ROLE_PERMISSIONS to gate sections.',
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2)
      }
    ],
    members: [
      {
        id: 'mem_olivia',
        name: 'Olivia Carter',
        email: 'olivia@teamflow.run',
        avatar: 'OC',
        role: 'owner',
        status: 'online',
        joinedAt: daysAgo(42)
      },
      {
        id: 'mem_mason',
        name: 'Mason Lee',
        email: 'mason@teamflow.run',
        avatar: 'ML',
        role: 'admin',
        status: 'online',
        joinedAt: daysAgo(18)
      },
      {
        id: 'mem_ava',
        name: 'Ava Patel',
        email: 'ava@teamflow.run',
        avatar: 'AP',
        role: 'manager',
        status: 'away',
        joinedAt: daysAgo(27)
      },
      {
        id: 'mem_noah',
        name: 'Noah Kim',
        email: 'noah@teamflow.run',
        avatar: 'NK',
        role: 'developer',
        status: 'offline',
        joinedAt: daysAgo(9)
      },
      {
        id: 'mem_emma',
        name: 'Emma Stone',
        email: 'emma@teamflow.run',
        avatar: 'ES',
        role: 'viewer',
        status: 'online',
        joinedAt: daysAgo(5)
      }
    ],
    messages: [
      {
        id: 'msg_1',
        content: 'Launchpad board looks good. I want a stronger hover state for drop zones.',
        senderId: 'mem_mason',
        channelId: 'channel_launchpad',
        createdAt: daysAgo(1)
      },
      {
        id: 'msg_2',
        content: 'I will tighten the analytics copy after the sprint demo.',
        senderId: 'mem_ava',
        channelId: 'channel_team',
        createdAt: daysAgo(1)
      }
    ],
    documents: [
      {
        id: 'doc_release',
        title: 'Sprint Alpha Release Notes',
        content: '# Sprint Alpha\n\n- Kanban board refinements\n- Chat shell updates\n- Analytics calibration\n\n## Notes\n\nUse this doc for the demo summary.',
        projectId: 'proj_sprintcore',
        linkedTaskIds: ['task_metrics', 'task_chat'],
        authorId: 'mem_olivia',
        updatedAt: daysAgo(1)
      }
    ],
    channels: [
      { id: 'channel_team', name: 'Team HQ', type: 'workspace', relatedId: 'ws_teamflow' },
      { id: 'channel_launchpad', name: '#launchpad', type: 'project', relatedId: 'proj_launchpad' },
      { id: 'channel_sprintcore', name: '#sprintcore', type: 'project', relatedId: 'proj_sprintcore' }
    ],
    activeWorkspaceId: 'ws_teamflow',
    activeProjectId: 'proj_launchpad',
    activeSprintId: 'sprint_alpha',
    activeView: 'board'
  };
};
