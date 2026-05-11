import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { changePassword, getAuthMode, parseAuthUser, requestEmailLogin, requestEmailRegistration, requestPasswordResetOtp, resetPasswordWithOtp, startOAuthFlow, toggleTwoFactor, type EmailLoginResult } from './auth-bridge';
import type { AuthMode, AuthUser, MemberRole, OAuthProvider } from './types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  authMode: AuthMode;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithEmail: (email: string, password: string, otp?: string) => Promise<EmailLoginResult | void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, password: string) => Promise<void>;
  setTwoFactorEnabled: (enabled: boolean, password: string) => Promise<void>;
  completeOAuthLogin: (user: AuthUser, token?: string) => void;
  clearAuthError: () => void;
  logout: () => void;
  getAuthToken: () => string | null;
}

const avatarFor = (name: string) =>
  name
    .split(' ')
    .map(part => part.slice(0, 1))
    .join('')
    .slice(0, 2)
    .toUpperCase();

const createUser = (provider: AuthUser['provider'], email: string, name?: string, role: MemberRole = 'admin'): AuthUser => {
  const displayName = name?.trim() || email.split('@')[0].replace(/[._-]+/g, ' ');

  return {
    id: `auth_${provider}_${Date.now()}`,
    name: displayName
      .split(' ')
      .map(part => part.slice(0, 1).toUpperCase() + part.slice(1))
      .join(' '),
    email,
    provider,
    role,
    subscriptionTier: 'free',
    avatar: avatarFor(displayName)
  };
};

const createDemoAuth = (provider: AuthUser['provider'], name: string, email: string) =>
  createUser(provider, email, name, 'admin');

const withAuthError = (set: (partial: Partial<AuthState>) => void, message: string) => {
  set({ authError: message });
  throw new Error(message);
};

const runOAuth = (provider: OAuthProvider, set: (partial: Partial<AuthState>) => void) => {
  const mode = getAuthMode();
  set({ authMode: mode, authError: null });

  if (mode === 'real') {
    startOAuthFlow(provider);
    return;
  }

  const seed = provider === 'google'
    ? createDemoAuth('google', 'Google Demo User', 'google-demo@teamflow.run')
    : provider === 'github'
      ? createDemoAuth('github', 'GitHub Demo User', 'github-demo@teamflow.run')
      : createDemoAuth('apple', 'Apple Demo User', 'apple-demo@teamflow.run');

  set({ user: seed, isAuthenticated: true, authError: null, authMode: 'demo' });
};

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      token: null,
      isAuthenticated: false,
      authMode: getAuthMode(),
      authError: null,
      loginWithGoogle: async () => runOAuth('google', set),
      loginWithGitHub: async () => runOAuth('github', set),
      loginWithApple: async () => runOAuth('apple', set),
      loginWithEmail: async (email, password, otp) => {
        const mode = getAuthMode();
        set({ authMode: mode, authError: null });

        if (mode === 'demo') {
          set({ user: createUser('email', email, email.split('@')[0]), isAuthenticated: true, authError: null, token: 'demo-token' });
          return;
        }

        try {
          const result = await requestEmailLogin(email, password, otp);

          if ('twoFactorRequired' in result) {
            set({ authError: null, authMode: 'real' });
            return result;
          }

          const token = localStorage.getItem('authToken');
          set({ user: parseAuthUser(result.user ?? result, 'email'), isAuthenticated: true, authError: null, authMode: 'real', token });
          return result;
        } catch (error) {
          withAuthError(set, error instanceof Error ? error.message : 'Email login failed.');
        }
      },
      requestPasswordReset: async (email: string) => {
        const mode = getAuthMode();
        if (mode === 'demo') {
          return;
        }

        await requestPasswordResetOtp(email);
      },
      resetPassword: async (email: string, otp: string, password: string) => {
        const mode = getAuthMode();
        if (mode === 'demo') {
          return;
        }

        await resetPasswordWithOtp(email, otp, password);
      },
      changePassword: async (currentPassword: string, password: string) => {
        const mode = getAuthMode();
        if (mode === 'demo') {
          return;
        }

        await changePassword(currentPassword, password);
      },
      setTwoFactorEnabled: async (enabled: boolean, password: string) => {
        const mode = getAuthMode();
        if (mode === 'demo') {
          return;
        }

        await toggleTwoFactor(enabled, password);
      },
      register: async (name, email, password) => {
        const mode = getAuthMode();
        set({ authMode: mode, authError: null });

        if (mode === 'demo') {
          set({ user: createUser('email', email, name), isAuthenticated: true, authError: null, token: 'demo-token' });
          return;
        }

        try {
          const user = await requestEmailRegistration(name, email, password);
          const token = localStorage.getItem('authToken');
          set({ user, isAuthenticated: true, authError: null, authMode: 'real', token });
        } catch (error) {
          withAuthError(set, error instanceof Error ? error.message : 'Registration failed.');
        }
      },
      completeOAuthLogin: (user, token) => {
        if (token) {
          localStorage.setItem('authToken', token);
        }
        set({ user: parseAuthUser(user, user.provider), isAuthenticated: true, authMode: 'real', authError: null, token });
      },
      clearAuthError: () => set({ authError: null }),
      logout: () => {
        localStorage.removeItem('authToken');
        set({ user: null, isAuthenticated: false, authError: null, token: null });
      },
      getAuthToken: () => {
        const token = localStorage.getItem('authToken');
        return token;
      }
    }),
    {
      name: 'teamflow-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        authMode: state.authMode,
        authError: state.authError,
        token: state.token
      })
    }
  )
);