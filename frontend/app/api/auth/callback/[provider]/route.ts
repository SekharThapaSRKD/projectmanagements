import { NextResponse } from 'next/server';
import type { OAuthProvider } from '@/lib/types';

const providers: OAuthProvider[] = ['google', 'github', 'apple'];

const getAuthProviderBase = () => {
  const value = process.env.NEXT_PUBLIC_AUTH_PROVIDER_URL?.trim() || '';
  return value.replace(/\/$/, '');
};

const redirectLogin = (request: Request, params: Record<string, string>) => {
  const loginUrl = new URL('/login', request.url);
  for (const [key, value] of Object.entries(params)) {
    loginUrl.searchParams.set(key, value);
  }

  return NextResponse.redirect(loginUrl);
};

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;

  if (!providers.includes(provider as OAuthProvider)) {
    return redirectLogin(request, { authError: 'unsupported_provider' });
  }

  const requestUrl = new URL(request.url);
  const authError = requestUrl.searchParams.get('error');
  if (authError) {
    return redirectLogin(request, { authError });
  }

  const code = requestUrl.searchParams.get('code');
  if (!code) {
    return redirectLogin(request, { authError: 'missing_code' });
  }

  const base = getAuthProviderBase();
  if (!base) {
    return redirectLogin(request, { authError: 'missing_auth_provider' });
  }

  const redirectUri = `${requestUrl.origin}/api/auth/callback/${provider}`;

  try {
    // Exchange code with backend
    const exchangeResponse = await fetch(`${base}/api/v1/auth/${provider}/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state: requestUrl.searchParams.get('state') || '', redirectUri }),
      cache: 'no-store'
    });

    if (!exchangeResponse.ok) {
      return redirectLogin(request, { authError: `exchange_failed_${exchangeResponse.status}` });
    }

    const payload = (await exchangeResponse.json()) as { token?: string; user?: unknown };
    
    if (!payload.token) {
      return redirectLogin(request, { authError: 'no_token' });
    }

    const user = payload.user ?? payload;
    const encodedUser = Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');

    // Redirect to login with token and user info
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('authSuccess', '1');
    loginUrl.searchParams.set('provider', provider);
    loginUrl.searchParams.set('user', encodedUser);
    loginUrl.searchParams.set('token', payload.token);

    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return redirectLogin(request, { authError: 'exchange_failed' });
  }
}