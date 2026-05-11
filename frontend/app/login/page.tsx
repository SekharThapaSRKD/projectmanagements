'use client';

import { Apple, ArrowRight, Github, Mail, ShieldCheck, Sparkles, Loader2, Command, Globe, Layout, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { decodeOAuthUser, getAuthMode } from '@/lib/auth-bridge';
import type { OAuthProvider } from '@/lib/types';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-white">
          Loading authentication...
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithGoogle, loginWithGitHub, loginWithApple, loginWithEmail, register, requestPasswordReset, resetPassword, completeOAuthLogin, authError, clearAuthError } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@gmail.com');
  const [password, setPassword] = useState('password');
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [challengeRequired, setChallengeRequired] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  const authMode = getAuthMode();

  const complete = () => {
    const redirectUrl = searchParams.get('redirect');
    if (redirectUrl) {
      router.replace(redirectUrl);
    } else {
      router.replace('/');
    }
  };

  useEffect(() => {
    const authSuccess = searchParams.get('authSuccess');
    const provider = searchParams.get('provider');
    const user = searchParams.get('user');
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const callbackError = searchParams.get('authError');

    // Handle error from OAuth provider or backend
    if (error) {
      setLocalError(`Authentication failed: ${error}`);
      return;
    }

    if (callbackError) {
      setLocalError(`OAuth callback failed: ${callbackError}`);
      return;
    }

    // Handle OAuth callback redirect from backend (new flow)
    if (token && user) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(user));
        completeOAuthLogin(parsedUser, token);
        complete();
      } catch (err) {
        setLocalError('Unable to parse OAuth callback payload.');
      }
      return;
    }

    // Handle legacy OAuth callback (if still using old flow)
    if (authSuccess === '1' && provider && user) {
      try {
        const parsedUser = decodeOAuthUser(user, provider as OAuthProvider);
        completeOAuthLogin(parsedUser, token || undefined);
        complete();
      } catch {
        setLocalError('Unable to parse OAuth callback payload.');
      }
    }
  }, [completeOAuthLogin, router, searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setLocalError(null);
    clearAuthError();

    try {
      if (mode === 'register') {
        await register(name || 'Demo User', email, password);
        complete();
      } else if (mode === 'login') {
        const result = await loginWithEmail(email, password, challengeRequired ? twoFactorCode : undefined);
        if (result && 'twoFactorRequired' in result) {
          setChallengeRequired(true);
          setPending(false);
          return;
        }
        complete();
      } else {
        if (resetStep === 'request') {
          await requestPasswordReset(email);
          setResetStep('verify');
        } else {
          await resetPassword(email, resetCode, resetNewPassword);
          setMode('login');
          setResetStep('request');
          setTwoFactorCode('');
          setResetCode('');
          setResetNewPassword('');
        }
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setPending(false);
    }
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setPending(true);
    setLocalError(null);
    clearAuthError();

    try {
      if (provider === 'google') await loginWithGoogle();
      if (provider === 'github') await loginWithGitHub();
      if (provider === 'apple') await loginWithApple();

      if (authMode === 'demo') {
        complete();
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'OAuth sign-in failed.');
      setPending(false);
    }
  };

  const LoadingOverlay = () => (
    <AnimatePresence>
      {pending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
        >
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-[hsl(var(--accent)/0.1)] border-t-[hsl(var(--accent))]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Command className="h-8 w-8 text-[hsl(var(--accent))]" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest text-white">Initializing Session</h3>
              <p className="mt-2 text-sm text-[hsl(var(--muted))]">Synchronizing with workspace core...</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <main className="min-h-screen bg-[hsl(var(--bg))] selection:bg-[hsl(var(--accent)/0.3)] selection:text-white">
      <LoadingOverlay />
      
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left Side: Brand & Features */}
        <section className="relative hidden flex-col justify-between overflow-hidden p-16 lg:flex">
          {/* Background Decoration */}
          <div className="absolute left-0 top-0 -z-10 h-full w-full opacity-20">
            <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-[hsl(var(--accent)/0.15)] blur-[120px]" />
            <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[100px]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--accent)/0.6)] text-black shadow-lg shadow-[hsl(var(--accent)/0.2)]">
                <Command className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">TeamFlow</h1>
            </div>

            <div className="mt-20 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-[hsl(var(--muted))] mb-6">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                {authMode === 'real' ? 'Real-Time Sync Active' : 'Offline Preview Mode'}
              </div>
              <h2 className="mt-0 text-6xl font-black leading-[1] tracking-tighter text-white lg:text-7xl xl:text-8xl">
                RUN YOUR <span className="text-[hsl(var(--accent))]">TEAM</span> FROM ONE CALM CORE.
              </h2>
              <p className="mt-8 max-w-xl text-xl leading-relaxed text-[hsl(var(--muted))]">
                The high-fidelity workspace for autonomous developers. Kanban, Scrum, and real-time collaboration architected for speed and clarity.
              </p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-4">
            {[
              { title: 'Project Nodes', body: 'Drag tasks with instant reactive feedback', icon: Layout },
              { title: 'Core Intel', body: 'Markdown documentation with live preview', icon: Globe },
              { title: 'Analytics', body: 'KPI signals and velocity charts', icon: Layers }
            ].map((feature, i) => (
              <motion.article 
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-5 transition-all hover:bg-white/[0.08]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[hsl(var(--muted))] transition-colors group-hover:bg-[hsl(var(--accent)/0.1)] group-hover:text-[hsl(var(--accent))]">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-sm text-white">{feature.title}</h3>
                <p className="mt-1 text-xs leading-snug text-[hsl(var(--muted))]">{feature.body}</p>
              </motion.article>
            ))}
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 mt-6 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))]">
            <div className="flex items-center gap-6">
              <span>© 2026 TEAMFLOW.RUN</span>
              <span className="h-1 w-1 rounded-full bg-white/10" />
              <span>PRODUCTION v4.2.0</span>
            </div>
            <div className="flex items-center gap-4">
              <ShieldCheck className="h-4 w-4 text-[hsl(var(--accent))]" />
              {authMode === 'real' ? 'BACKEND SECURED' : 'LOCAL-ONLY PROTOCOL'}
            </div>
          </div>
        </section>

        {/* Right Side: Authentication */}
        <section className="flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 bg-white/[0.02] lg:bg-transparent">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <div className="lg:hidden flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-black">
                  <Command className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-black uppercase tracking-tighter text-white">TeamFlow</h1>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[hsl(var(--muted))]">Authentication</p>
              <h2 className="mt-2 text-4xl font-black tracking-tighter text-white">ACCESS PORTAL</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'google', icon: Mail, label: 'Google' },
                  { id: 'github', icon: Github, label: 'GitHub' },
                  { id: 'apple', icon: Apple, label: 'Apple' }
                ].map((provider) => (
                  <button 
                    key={provider.id}
                    type="button" 
                    onClick={() => handleOAuth(provider.id as OAuthProvider)} 
                    className="flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all hover:bg-white/10 active:scale-95"
                    title={`Sign in with ${provider.label}`}
                  >
                    <provider.icon className="h-5 w-5 text-white/60" />
                  </button>
                ))}
              </div>

              <div className="relative my-6 flex items-center justify-center">
                <span className="h-px w-full bg-white/10" />
                <span className="absolute bg-[hsl(var(--bg))] px-4 text-[10px] font-black uppercase tracking-[0.3em] text-[hsl(var(--muted))]">
                  Or use protocol
                </span>
              </div>

              {(localError || authError) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-500"
                >
                  {localError || authError}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    {mode === 'register' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))] px-1">Full Name</label>
                        <input
                          value={name}
                          onChange={event => setName(event.target.value)}
                          placeholder="Olivia Carter"
                          className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)] focus:ring-4 focus:ring-[hsl(var(--accent)/0.05)] transition-all"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))] px-1">Email Address</label>
                      <input
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        type="email"
                        placeholder="demo@teamflow.run"
                        className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)] focus:ring-4 focus:ring-[hsl(var(--accent)/0.05)] transition-all"
                      />
                    </div>

                    {mode !== 'forgot' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))] px-1">Password</label>
                        <input
                          value={password}
                          onChange={event => setPassword(event.target.value)}
                          type="password"
                          placeholder="••••••••"
                          className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)] focus:ring-4 focus:ring-[hsl(var(--accent)/0.05)] transition-all"
                        />
                      </div>
                    )}

                    {mode === 'login' && challengeRequired && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))] px-1 text-[hsl(var(--accent))]">Two-Factor Auth Required</label>
                        <input
                          value={twoFactorCode}
                          onChange={event => setTwoFactorCode(event.target.value)}
                          inputMode="numeric"
                          placeholder="Enter 6-digit code"
                          className="w-full h-14 rounded-2xl border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.05)] px-5 text-sm text-white outline-none focus:ring-4 focus:ring-[hsl(var(--accent)/0.05)] transition-all"
                        />
                      </div>
                    )}

                    {mode === 'forgot' && resetStep === 'verify' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))] px-1">Verification Code</label>
                          <input
                            value={resetCode}
                            onChange={event => setResetCode(event.target.value)}
                            inputMode="numeric"
                            placeholder="123456"
                            className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)] transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))] px-1">New Secure Password</label>
                          <input
                            value={resetNewPassword}
                            onChange={event => setResetNewPassword(event.target.value)}
                            type="password"
                            placeholder="••••••••"
                            className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)] transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <button 
                  type="submit" 
                  disabled={pending}
                  className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-white text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {mode === 'login' 
                      ? (challengeRequired ? 'Verify & Secure Session' : 'Initiate Session') 
                      : mode === 'register' ? 'Register Unit' : 'Send Protocol'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 -z-0 bg-gradient-to-r from-white to-[hsl(var(--accent))] opacity-0 transition-opacity group-hover:opacity-10" />
                </button>
              </form>

              <div className="mt-8 space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))]">
                  {mode === 'login' ? (
                    <>
                      <span>Don't have access?</span>
                      <button onClick={() => setMode('register')} className="text-white hover:text-[hsl(var(--accent))] transition-colors">Request Account</button>
                    </>
                  ) : (
                    <>
                      <span>Already authorized?</span>
                      <button onClick={() => setMode('login')} className="text-white hover:text-[hsl(var(--accent))] transition-colors">Sign in here</button>
                    </>
                  )}
                </div>
                {mode === 'login' && (
                  <button onClick={() => setMode('forgot')} className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))] hover:text-white transition-colors">
                    Emergency: Forgot Password?
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}