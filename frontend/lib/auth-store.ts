import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { changePassword, deleteAccount, getAuthMode, parseAuthUser, requestEmailLogin, requestEmailRegistration, requestPasswordResetOtp, resetPasswordWithOtp, startOAuthFlow, toggleTwoFactor, type EmailLoginResult } from './auth-bridge';
import type { AuthMode, AuthUser, OAuthProvider, SubscriptionTier } from './types';

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
  deleteAccount: (password: string) => Promise<void>;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
  completeOAuthLogin: (user: AuthUser, token?: string) => void;
  refreshCurrentUser: () => Promise<void>;
  clearAuthError: () => void;
  logout: () => void;
  getAuthToken: () => string | null;
}

const withAuthError = (set: (partial: Partial<AuthState>) => void, message: string) => {
  set({ authError: message });
  throw new Error(message);
};

const runOAuth = (provider: OAuthProvider, set: (partial: Partial<AuthState>) => void) => {
  set({ authMode: 'real', authError: null });
  startOAuthFlow(provider);
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
        set({ authMode: 'real', authError: null });

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
        await requestPasswordResetOtp(email);
      },
      resetPassword: async (email: string, otp: string, password: string) => {
        await resetPasswordWithOtp(email, otp, password);
      },
      changePassword: async (currentPassword: string, password: string) => {
        await changePassword(currentPassword, password);
      },
      setTwoFactorEnabled: async (enabled: boolean, password: string) => {
        await toggleTwoFactor(enabled, password);
      },
      deleteAccount: async (password: string) => {
        await deleteAccount(password);
        localStorage.removeItem('authToken');
        set({ user: null, isAuthenticated: false, authError: null, token: null });
      },
      setSubscriptionTier: (tier: SubscriptionTier) => {
        set(state => ({
          user: state.user ? { ...state.user, subscriptionTier: tier } : state.user
        }));
      },
      register: async (name, email, password) => {
        set({ authMode: 'real', authError: null });

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
      refreshCurrentUser: async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
          return;
        }

        const baseUrl = (process.env.NEXT_PUBLIC_AUTH_PROVIDER_URL || '').trim().replace(/\/$/, '');
        if (!baseUrl) {
          return;
        }

        let response: Response;
        try {
          response = await fetch(`${baseUrl}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (err) {
          console.warn('Failed to reach auth provider:', err);
          return;
        }

        if (!response.ok) {
          return;
        }

        const user = await response.json();
        set({ user: parseAuthUser(user, user.provider ?? 'email'), isAuthenticated: true, authMode: 'real', authError: null, token });
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