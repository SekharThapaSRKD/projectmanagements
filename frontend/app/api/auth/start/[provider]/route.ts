import { NextResponse } from 'next/server';
import type { OAuthProvider } from '@/lib/types';

const providers: OAuthProvider[] = ['google', 'github', 'apple'];

const getAuthProviderBase = () => {
  const value = process.env.NEXT_PUBLIC_AUTH_PROVIDER_URL?.trim() || '';
  return value.replace(/\/$/, '');
};

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;

  if (!providers.includes(provider as OAuthProvider)) {
    return NextResponse.redirect(new URL('/login?authError=unsupported_provider', request.url));
  }

  const base = getAuthProviderBase();
  if (!base) {
    return NextResponse.redirect(new URL('/login?authError=missing_auth_provider', request.url));
  }

  try {
    // Get OAuth start URL from backend
    const response = await fetch(`${base}/api/v1/auth/${provider}/start`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL('/login?authError=oauth_start_failed', request.url));
    }

    const data = (await response.json()) as { authUrl?: string };
    if (!data.authUrl) {
      return NextResponse.redirect(new URL('/login?authError=no_auth_url', request.url));
    }

    return NextResponse.redirect(data.authUrl);
  } catch (error) {
    console.error('OAuth start error:', error);
    return NextResponse.redirect(new URL('/login?authError=oauth_start_error', request.url));
  }
}