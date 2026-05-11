import axios from 'axios';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';

export interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'google' | 'github';
}

export class OAuthService {
  // ===== GOOGLE OAUTH =====
  static async getGoogleAuthUrl(redirectUri: string, state: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
      access_type: 'offline',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  static async exchangeGoogleCode(code: string, redirectUri: string): Promise<OAuthProfile> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      const { access_token } = response.data;

      const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const { id, email, name, picture } = userResponse.data;

      return {
        id,
        email,
        name,
        avatar: picture,
        provider: 'google',
      };
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  // ===== GITHUB OAUTH =====
  static async getGitHubAuthUrl(redirectUri: string, state: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: 'user:email',
      state: state,
      allow_signup: 'true',
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  static async exchangeGitHubCode(code: string, redirectUri: string): Promise<OAuthProfile> {
    try {
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      const { access_token } = tokenResponse.data;

      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const { id, email: githubEmail, name, avatar_url } = userResponse.data;

      // Get email if not in user object
      let email = githubEmail;
      if (!email) {
        const emailsResponse = await axios.get('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const primaryEmail = emailsResponse.data.find((e: any) => e.primary);
        email = primaryEmail?.email || `user-${id}@github.com`;
      }

      return {
        id: id.toString(),
        email,
        name: name || githubEmail?.split('@')[0] || 'GitHub User',
        avatar: avatar_url,
        provider: 'github',
      };
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      throw new Error('Failed to authenticate with GitHub');
    }
  }

  static generateState(): string {
    return nanoid(32);
  }
}
