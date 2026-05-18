import type { SeedData, Message } from './types';

const cleanupBase = (baseUrl: string | undefined) => (baseUrl ? baseUrl.trim().replace(/\/$/, '') : '');

export const getTeamFlowApiBase = () => cleanupBase(process.env.NEXT_PUBLIC_AUTH_PROVIDER_URL);

export const isTeamFlowApiConfigured = () => Boolean(getTeamFlowApiBase());

const requestJson = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const baseUrl = getTeamFlowApiBase();
  if (!baseUrl) {
    throw new Error('TeamFlow backend is not configured. Add NEXT_PUBLIC_AUTH_PROVIDER_URL in .env.local.');
  }

  // Get auth token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(init.headers ?? {})
      },
      cache: 'no-store'
    });
  } catch (err) {
    throw new Error(`Network error contacting TeamFlow backend at ${baseUrl}${path}: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    const message = await response.text();

    let parsed: any = null;
    try {
      parsed = JSON.parse(message);
    } catch {
      // Keep the raw text fallback below when body is not JSON.
    }

    if (parsed?.details) {
      throw new Error(`${parsed.error}: ${parsed.details}`);
    }

    if (parsed?.error) {
      throw new Error(parsed.error);
    }

    throw new Error(message || `Request failed (${response.status}).`);
  }

  return (await response.json()) as T;
};

export const fetchBootstrap = async (workspaceId?: string, projectId?: string, channelId?: string): Promise<Partial<SeedData>> => {
  const query = new URLSearchParams();
  if (workspaceId) query.set('workspaceId', workspaceId);
  if (projectId) query.set('projectId', projectId);
  if (channelId) query.set('channelId', channelId);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return requestJson<Partial<SeedData>>(`/api/v1/bootstrap${qs}`);
};

export const fetchMessages = async (channelId: string): Promise<Message[]> => requestJson<Message[]>(`/api/v1/messages?channelId=${channelId}`);

export const sendTeamFlowMessage = async (content: string, channelId?: string, senderId?: string) =>
  requestJson('/api/v1/messages', {
    method: 'POST',
    body: JSON.stringify({ content, channelId, senderId })
  });

export const addTaskComment = async (taskId: string, content: string, authorId?: string) =>
  requestJson(`/api/v1/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, authorId })
  });

export const subscribeToTeamFlowInvalidations = (
  onInvalidate: () => void,
  onEvent?: (event: { type: string; data?: any; timestamp?: string }) => void
) => {
  const baseUrl = getTeamFlowApiBase();
  if (!baseUrl || typeof EventSource === 'undefined') {
    return () => undefined;
  }

  const source = new EventSource(`${baseUrl}/api/v1/realtime/events`);

  source.addEventListener('state.invalidated', () => onInvalidate());
  source.addEventListener('message:created', (e: MessageEvent) => {
    try {
      const parsed = JSON.parse(e.data);
      onEvent?.(parsed);
    } catch {
      // ignore parse errors
    }
  });

  // Also forward other generic events to onEvent
  source.addEventListener('connected', (e: MessageEvent) => {
    try {
      const parsed = JSON.parse(e.data);
      onEvent?.(parsed);
    } catch {
      // ignore
    }
  });

  return () => source.close();
};

type ResourceName = 'workspaces' | 'projects' | 'sprints' | 'tasks' | 'members' | 'messages' | 'documents' | 'channels' | 'boards';

const resourcePath = (resource: ResourceName, id?: string) => `/api/v1/${resource}${id ? `/${id}` : ''}`;

export const createTeamFlowResource = async <T>(resource: ResourceName, body: unknown) => requestJson<T>(resourcePath(resource), {
  method: 'POST',
  body: JSON.stringify(body)
});

export const updateTeamFlowResource = async <T>(resource: ResourceName, id: string, body: unknown) => requestJson<T>(resourcePath(resource, id), {
  method: 'PATCH',
  body: JSON.stringify(body)
});

export const deleteTeamFlowResource = async (resource: ResourceName, id: string) => requestJson(resourcePath(resource, id), {
  method: 'DELETE'
});

export const updateActiveView = (_view: string) => Promise.resolve();

export const inviteUserToTeamFlow = async (workspaceId: string, email: string, role: string, projectId?: string) =>
  requestJson<{ success: boolean; message: string; invitationUrl: string }>('/api/v1/team/invite', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, email, role, projectId })
  });

export const acceptTeamFlowInvite = async (token: string) =>
  requestJson<{ success: boolean; message: string; workspaceId: string }>('/api/v1/team/accept-invitation', {
    method: 'POST',
    body: JSON.stringify({ token })
  });

export const uploadAvatar = async (file: File): Promise<{ success: boolean; avatarUrl: string; message: string }> => {
  const baseUrl = getTeamFlowApiBase();
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  
  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/uploads/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData
    });
  } catch (err) {
    throw new Error(`Network error uploading avatar to ${baseUrl}/api/v1/uploads/avatar: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Upload failed (${response.status}).`);
  }

  return await response.json();
};

export const uploadFile = async (file: File): Promise<{ success: boolean; url: string; filename: string; size?: number; mimeType?: string }> => {
  const baseUrl = getTeamFlowApiBase();
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/uploads/file`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData
    });
  } catch (err) {
    throw new Error(`Network error uploading file to ${baseUrl}/api/v1/uploads/file: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Upload failed (${response.status}).`);
  }

  return await response.json();
};
