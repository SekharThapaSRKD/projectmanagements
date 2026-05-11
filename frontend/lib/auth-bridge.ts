import type { AuthMode, AuthUser, MemberRole, OAuthProvider } from './types';

export type EmailLoginResult =
  | { token: string; user?: unknown }
  | { twoFactorRequired: true; message?: string };

const getStoredToken = () => (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);

const DEFAULT_ROLE: MemberRole = 'admin';
const validRoles: MemberRole[] = ['owner', 'admin', 'manager', 'developer', 'viewer'];

const avatarFor = (name: string) =>
  name
    .split(' ')
    .map(part => part.slice(0, 1))
    .join('')
    .slice(0, 2)
    .toUpperCase();

const ensureRole = (value: unknown): MemberRole => {
  if (typeof value !== 'string') {
    return DEFAULT_ROLE;
  }

  return validRoles.includes(value as MemberRole) ? (value as MemberRole) : DEFAULT_ROLE;
};

const cleanupBase = (baseUrl: string | undefined) => {
  if (!baseUrl) {
    return '';
  }

  return baseUrl.trim().replace(/\/$/, '');
};

export const getAuthProviderBase = () => cleanupBase(process.env.NEXT_PUBLIC_AUTH_PROVIDER_URL);

export const getAuthMode = (): AuthMode => (getAuthProviderBase() ? 'real' : 'demo');

export const parseAuthUser = (input: unknown, fallbackProvider: AuthUser['provider']): AuthUser => {
  const candidate = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const nameRaw = typeof candidate.name === 'string' ? candidate.name : 'TeamFlow User';
  const emailRaw = typeof candidate.email === 'string' ? candidate.email : `${fallbackProvider}-user@teamflow.run`;
  const providerRaw = typeof candidate.provider === 'string' ? candidate.provider : fallbackProvider;
  const provider = ['google', 'github', 'apple', 'email'].includes(providerRaw) ? (providerRaw as AuthUser['provider']) : fallbackProvider;

  return {
    id: typeof candidate.id === 'string' ? candidate.id : `auth_${provider}_${Date.now()}`,
    name: nameRaw,
    email: emailRaw,
    provider,
    role: ensureRole(candidate.role),
    avatar: typeof candidate.avatar === 'string' ? candidate.avatar : avatarFor(nameRaw),
    memberId: typeof candidate.memberId === 'string' ? candidate.memberId : undefined
  };
};

const requestAuthJson = async <T>(path: string, init: RequestInit, includeAuth = false): Promise<T> => {
  const baseUrl = getAuthProviderBase();
  if (!baseUrl) {
    throw new Error('Real auth is not configured. Add NEXT_PUBLIC_AUTH_PROVIDER_URL in .env.local.');
  }

  const token = includeAuth ? getStoredToken() : null;

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Auth request failed (${response.status}).`);
  }

  return (await response.json()) as T;
};

export const requestEmailLogin = async (email: string, password: string, otp?: string) => {
  const payload = await requestAuthJson<EmailLoginResult | unknown>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, otp })
  });

  if (payload && typeof payload === 'object' && 'twoFactorRequired' in payload) {
    return payload as Extract<EmailLoginResult, { twoFactorRequired: true }>;
  }

  const data = payload as { token?: string; user?: unknown };
  const user = data.user ?? payload;
  
  // Store token
  if (typeof window !== 'undefined' && data.token) {
    localStorage.setItem('authToken', data.token);
  }
  
  return parseAuthUser(user, 'email');
};

export const requestPasswordResetOtp = async (email: string) =>
  requestAuthJson<{ message: string }>('/api/v1/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email })
  });

export const resetPasswordWithOtp = async (email: string, otp: string, password: string) =>
  requestAuthJson<{ message: string }>('/api/v1/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ email, otp, password })
  });

export const changePassword = async (currentPassword: string, password: string) =>
  requestAuthJson<{ message: string }>('/api/v1/auth/password/change', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, password })
  }, true);

export const getTwoFactorStatus = async () =>
  requestAuthJson<{ twoFactorEnabled: boolean }>('/api/v1/auth/2fa/status', { method: 'GET' }, true);

export const toggleTwoFactor = async (enabled: boolean, password: string) =>
  requestAuthJson<{ message: string }>('/api/v1/auth/2fa/toggle', {
    method: 'POST',
    body: JSON.stringify({ enabled, password })
  }, true);

export const requestEmailRegistration = async (name: string, email: string, password: string) => {
  const payload = await requestAuthJson<{ token: string; user?: unknown } | unknown>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });

  const data = payload as { token?: string; user?: unknown };
  const user = data.user ?? payload;
  
  // Store token
  if (typeof window !== 'undefined' && data.token) {
    localStorage.setItem('authToken', data.token);
  }
  
  return parseAuthUser(user, 'email');
};

export const startOAuthFlow = (provider: OAuthProvider) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.assign(`/api/auth/start/${provider}`);
};

export const decodeOAuthUser = (encoded: string, fallbackProvider: OAuthProvider): AuthUser => {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const decodedJson = JSON.parse(atob(padded));
  return parseAuthUser(decodedJson, fallbackProvider);
};