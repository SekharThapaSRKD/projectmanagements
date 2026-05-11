import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import bcryptjs from 'bcryptjs';
import { env } from '../config/env.js';
import { MongoService } from '../services/mongo-service.js';
import { OAuthService } from '../services/oauth-service.js';
import { mailService } from '../services/mail-service.js';
import type { Account } from '../types/models.js';

export const registerAuthRoutes = async (fastify: FastifyInstance, mongoService: MongoService) => {
  // OAuth state store (in production, use Redis or session store)
  const oauthStates = new Map<string, { provider: string; createdAt: number }>();
  const otpTtlMs = 10 * 60 * 1000;

  const buildUser = (account: Account) => ({
    id: account.id,
    email: account.email,
    name: account.name,
    avatar: account.avatar,
    role: account.role,
    memberId: account.memberId,
  });

  const buildToken = (account: Account) => jwt.sign(
    {
      id: account.id,
      email: account.email,
      memberId: account.memberId,
      role: account.role,
    },
    env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

  const sendOtpEmail = async (account: Account, purpose: 'login' | 'reset') => {
    const code = generateOtp();
    const hash = await bcryptjs.hash(code, 10);
    const expiresAt = new Date(Date.now() + otpTtlMs);

    if (purpose === 'login') {
      await mongoService.updateAccount(account.id, {
        twoFactorOtpHash: hash,
        twoFactorOtpExpiresAt: expiresAt,
        updatedAt: new Date()
      });
    } else {
      await mongoService.updateAccount(account.id, {
        passwordResetOtpHash: hash,
        passwordResetOtpExpiresAt: expiresAt,
        updatedAt: new Date()
      });
    }

    await mailService.sendEmail(
      account.email,
      purpose === 'login' ? 'TeamFlow login verification code' : 'TeamFlow password reset code',
      `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#e5e7eb;background:#0f172a;padding:24px;border-radius:16px">
          <h2 style="margin:0 0 12px">${purpose === 'login' ? 'Login verification code' : 'Password reset code'}</h2>
          <p>Use this one-time code in TeamFlow:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#111827;padding:18px 24px;border-radius:14px;display:inline-block;margin:12px 0">${code}</div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `
    );

    return code;
  };

  const verifyOtp = async (plain: string, hash?: string, expiresAt?: Date) => {
    if (!hash || !expiresAt || expiresAt.getTime() < Date.now()) {
      return false;
    }

    return bcryptjs.compare(plain, hash);
  };

  // ===== EMAIL LOGIN / REGISTER =====
  fastify.post<{ Body: { email: string; password: string; otp?: string } }>('/api/v1/auth/login', async (request, reply) => {
    const { email, password, otp } = request.body;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password required' });
    }

    const account = await mongoService.findAccountByEmail(email);

    if (!account || !account.passwordHash) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const isValid = await bcryptjs.compare(password, account.passwordHash);

    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    if (account.twoFactorEnabled) {
      if (!otp) {
        await sendOtpEmail(account, 'login');
        return reply.send({ twoFactorRequired: true, message: 'A verification code has been sent to your email.' });
      }

      const ok = await verifyOtp(otp, account.twoFactorOtpHash, account.twoFactorOtpExpiresAt);
      if (!ok) {
        return reply.status(401).send({ error: 'Invalid verification code' });
      }

      await mongoService.updateAccount(account.id, {
        twoFactorOtpHash: undefined,
        twoFactorOtpExpiresAt: undefined,
        updatedAt: new Date()
      });
    }

    const token = buildToken(account);

    return reply.send({
      token,
      user: buildUser(account),
    });
  });

  fastify.post<{ Body: { email: string } }>('/api/v1/auth/password/forgot', async (request, reply) => {
    const { email } = request.body;
    if (!email) {
      return reply.status(400).send({ error: 'Email required' });
    }

    const account = await mongoService.findAccountByEmail(email);
    if (account && account.passwordHash) {
      await sendOtpEmail(account, 'reset');
    }

    return reply.send({ message: 'If the account exists, a reset code has been sent.' });
  });

  fastify.post<{ Body: { email: string; otp: string; password: string } }>('/api/v1/auth/password/reset', async (request, reply) => {
    const { email, otp, password } = request.body;

    if (!email || !otp || !password) {
      return reply.status(400).send({ error: 'Email, code and password required' });
    }

    const account = await mongoService.findAccountByEmail(email);
    if (!account || !account.passwordHash) {
      return reply.status(400).send({ error: 'Invalid reset request' });
    }

    const ok = await verifyOtp(otp, account.passwordResetOtpHash, account.passwordResetOtpExpiresAt);
    if (!ok) {
      return reply.status(401).send({ error: 'Invalid or expired code' });
    }

    const passwordHash = await bcryptjs.hash(password, 10);
    await mongoService.updateAccount(account.id, {
      passwordHash,
      passwordResetOtpHash: undefined,
      passwordResetOtpExpiresAt: undefined,
      updatedAt: new Date()
    });

    return reply.send({ message: 'Password updated successfully' });
  });

  fastify.post<{ Body: { currentPassword: string; password: string } }>(
    '/api/v1/auth/password/change',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { currentPassword, password } = request.body;
      const authUser = request.user as { id: string } | undefined;

      if (!authUser?.id || !currentPassword || !password) {
        return reply.status(400).send({ error: 'Current password and new password required' });
      }

      const account = await mongoService.findAccountById(authUser.id);
      if (!account?.passwordHash) {
        return reply.status(404).send({ error: 'Account not found' });
      }

      const ok = await bcryptjs.compare(currentPassword, account.passwordHash);
      if (!ok) {
        return reply.status(401).send({ error: 'Current password is incorrect' });
      }

      const passwordHash = await bcryptjs.hash(password, 10);
      await mongoService.updateAccount(account.id, { passwordHash, updatedAt: new Date() });

      return reply.send({ message: 'Password changed successfully' });
    }
  );

  fastify.get('/api/v1/auth/2fa/status', { onRequest: [(fastify as any).authenticate] }, async (request, reply) => {
    const authUser = request.user as { id: string } | undefined;
    const account = authUser?.id ? await mongoService.findAccountById(authUser.id) : null;

    if (!account) {
      return reply.status(404).send({ error: 'Account not found' });
    }

    return reply.send({ twoFactorEnabled: Boolean(account.twoFactorEnabled) });
  });

  fastify.post<{ Body: { enabled: boolean; password: string } }>(
    '/api/v1/auth/2fa/toggle',
    { onRequest: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { enabled, password } = request.body;
      const authUser = request.user as { id: string } | undefined;

      if (!authUser?.id || typeof enabled !== 'boolean' || !password) {
        return reply.status(400).send({ error: 'Invalid request' });
      }

      const account = await mongoService.findAccountById(authUser.id);
      if (!account?.passwordHash) {
        return reply.status(404).send({ error: 'Account not found' });
      }

      const ok = await bcryptjs.compare(password, account.passwordHash);
      if (!ok) {
        return reply.status(401).send({ error: 'Password confirmation failed' });
      }

      await mongoService.updateAccount(account.id, {
        twoFactorEnabled: enabled,
        twoFactorOtpHash: undefined,
        twoFactorOtpExpiresAt: undefined,
        updatedAt: new Date()
      });

      return reply.send({ message: enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled' });
    }
  );

  fastify.post<{ Body: { email: string; password: string; name: string } }>(
    '/api/v1/auth/register',
    async (request, reply) => {
      const { email, password, name } = request.body;

      if (!email || !password || !name) {
        return reply.status(400).send({ error: 'Email, password and name required' });
      }

      const existingAccount = await mongoService.findAccountByEmail(email);

      if (existingAccount) {
        return reply.status(409).send({ error: 'Email already registered' });
      }

      const passwordHash = await bcryptjs.hash(password, 10);
      const id = `acct_${nanoid(12)}`;
      const memberId = `mem_${nanoid(12)}`;

      const newAccount: Account = {
        id,
        email,
        name,
        passwordHash,
        provider: 'email',
        role: 'member',
        avatar: name.substring(0, 2).toUpperCase(),
        memberId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await mongoService.createAccount(newAccount);

      // Create default workspace
      const workspaceId = `ws_${nanoid(12)}`;
      const workspace = {
        id: workspaceId,
        name: `${name}'s Workspace`,
        description: 'Your first workspace',
        ownerId: newAccount.id,
        memberIds: [newAccount.memberId],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await mongoService.createWorkspace(workspace);

      // Create free subscription
      const subscriptionId = `sub_${nanoid(12)}`;
      const now = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const subscription = {
        id: subscriptionId,
        accountId: newAccount.id,
        plan: 'free' as const,
        status: 'active' as const,
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        cancelAtPeriodEnd: false,
        createdAt: now,
        updatedAt: now,
      };
      await mongoService.createSubscription(subscription);

      const token = jwt.sign(
        {
          id: newAccount.id,
          email: newAccount.email,
          memberId: newAccount.memberId,
          role: newAccount.role,
        },
        env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return reply.status(201).send({
        token,
        user: {
          id: newAccount.id,
          email: newAccount.email,
          name: newAccount.name,
          avatar: newAccount.avatar,
          role: newAccount.role,
          memberId: newAccount.memberId,
        },
      });
    }
  );

  // ===== GOOGLE OAUTH =====
  fastify.get('/api/v1/auth/google/start', async (request, reply) => {
    const state = OAuthService.generateState();
    oauthStates.set(state, { provider: 'google', createdAt: Date.now() });

    const redirectUri = `http://localhost:4000/api/v1/auth/google/callback`;
    const authUrl = await OAuthService.getGoogleAuthUrl(redirectUri, state);

    return reply.send({ authUrl });
  });

  fastify.get<{ Querystring: { code: string; state: string; error?: string } }>(
    '/api/v1/auth/google/callback',
    async (request, reply) => {
      const { code, state, error } = request.query;

      if (error) {
        return reply.redirect(`${env.FRONTEND_URL}/login?error=${error}`);
      }

      const stateData = oauthStates.get(state);
      if (!stateData || stateData.provider !== 'google') {
        return reply.redirect(`${env.FRONTEND_URL}/login?error=invalid_state`);
      }

      oauthStates.delete(state);

      try {
        const redirectUri = `http://localhost:4000/api/v1/auth/google/callback`;
        const profile = await OAuthService.exchangeGoogleCode(code, redirectUri);

        // Find or create account
        let account = await mongoService.findAccountByEmail(profile.email);

        if (!account) {
          account = await mongoService.findAccountByProviderId(profile.id);
        }

        if (!account) {
          // Create new account
          const id = `acct_${nanoid(12)}`;
          const memberId = `mem_${nanoid(12)}`;

          const newAccount: Account = {
            id,
            email: profile.email,
            name: profile.name,
            provider: 'google',
            providerId: profile.id,
            role: 'member',
            avatar: profile.avatar || profile.name.substring(0, 2).toUpperCase(),
            memberId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          account = await mongoService.createAccount(newAccount);

          // Create default workspace
          const workspaceId = `ws_${nanoid(12)}`;
          const workspace = {
            id: workspaceId,
            name: `${profile.name}'s Workspace`,
            description: 'Your first workspace',
            ownerId: account.id,
            memberIds: [account.memberId],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await mongoService.createWorkspace(workspace);

          // Create free subscription
          const subscriptionId = `sub_${nanoid(12)}`;
          const now = new Date();
          const endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 1);

          const subscription = {
            id: subscriptionId,
            accountId: account.id,
            plan: 'free' as const,
            status: 'active' as const,
            currentPeriodStart: now,
            currentPeriodEnd: endDate,
            cancelAtPeriodEnd: false,
            createdAt: now,
            updatedAt: now,
          };
          await mongoService.createSubscription(subscription);
        }

        const token = jwt.sign(
          {
            id: account.id,
            email: account.email,
            memberId: account.memberId,
            role: account.role,
          },
          env.JWT_SECRET,
          { expiresIn: '30d' }
        );

        const user = JSON.stringify({
          id: account.id,
          email: account.email,
          name: account.name,
          avatar: account.avatar,
          role: account.role,
          memberId: account.memberId,
        });

        return reply.redirect(
          `${env.FRONTEND_URL}/login?token=${encodeURIComponent(token)}&user=${encodeURIComponent(user)}`
        );
      } catch (error) {
        console.error('Google OAuth callback error:', error);
        return reply.redirect(`${env.FRONTEND_URL}/login?error=authentication_failed`);
      }
    }
  );

  // ===== GITHUB OAUTH =====
  fastify.get('/api/v1/auth/github/start', async (request, reply) => {
    const state = OAuthService.generateState();
    oauthStates.set(state, { provider: 'github', createdAt: Date.now() });

    const redirectUri = `http://localhost:4000/api/v1/auth/github/callback`;
    const authUrl = await OAuthService.getGitHubAuthUrl(redirectUri, state);

    return reply.send({ authUrl });
  });

  fastify.get<{ Querystring: { code: string; state: string; error?: string } }>(
    '/api/v1/auth/github/callback',
    async (request, reply) => {
      const { code, state, error } = request.query;

      if (error) {
        return reply.redirect(`${env.FRONTEND_URL}/login?error=${error}`);
      }

      const stateData = oauthStates.get(state);
      if (!stateData || stateData.provider !== 'github') {
        return reply.redirect(`${env.FRONTEND_URL}/login?error=invalid_state`);
      }

      oauthStates.delete(state);

      try {
        const redirectUri = `http://localhost:4000/api/v1/auth/github/callback`;
        const profile = await OAuthService.exchangeGitHubCode(code, redirectUri);

        // Find or create account
        let account = await mongoService.findAccountByEmail(profile.email);

        if (!account) {
          account = await mongoService.findAccountByProviderId(profile.id);
        }

        if (!account) {
          // Create new account
          const id = `acct_${nanoid(12)}`;
          const memberId = `mem_${nanoid(12)}`;

          const newAccount: Account = {
            id,
            email: profile.email,
            name: profile.name,
            provider: 'github',
            providerId: profile.id,
            role: 'member',
            avatar: profile.avatar || profile.name.substring(0, 2).toUpperCase(),
            memberId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          account = await mongoService.createAccount(newAccount);

          // Create default workspace
          const workspaceId = `ws_${nanoid(12)}`;
          const workspace = {
            id: workspaceId,
            name: `${profile.name}'s Workspace`,
            description: 'Your first workspace',
            ownerId: account.id,
            memberIds: [account.memberId],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await mongoService.createWorkspace(workspace);

          // Create free subscription
          const subscriptionId = `sub_${nanoid(12)}`;
          const now = new Date();
          const endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 1);

          const subscription = {
            id: subscriptionId,
            accountId: account.id,
            plan: 'free' as const,
            status: 'active' as const,
            currentPeriodStart: now,
            currentPeriodEnd: endDate,
            cancelAtPeriodEnd: false,
            createdAt: now,
            updatedAt: now,
          };
          await mongoService.createSubscription(subscription);
        }

        const token = jwt.sign(
          {
            id: account.id,
            email: account.email,
            memberId: account.memberId,
            role: account.role,
          },
          env.JWT_SECRET,
          { expiresIn: '30d' }
        );

        const user = JSON.stringify({
          id: account.id,
          email: account.email,
          name: account.name,
          avatar: account.avatar,
          role: account.role,
          memberId: account.memberId,
        });

        return reply.redirect(
          `${env.FRONTEND_URL}/login?token=${encodeURIComponent(token)}&user=${encodeURIComponent(user)}`
        );
      } catch (error) {
        console.error('GitHub OAuth callback error:', error);
        return reply.redirect(`${env.FRONTEND_URL}/login?error=authentication_failed`);
      }
    }
  );

  // ===== VERIFY TOKEN =====
  fastify.get('/api/v1/auth/me', async (request, reply) => {
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    try {
      const decoded = fastify.jwt.verify(token) as any;
      const account = await mongoService.findAccountById(decoded.id);

      if (!account) {
        return reply.status(401).send({ error: 'User not found' });
      }

      return reply.send({
        id: account.id,
        email: account.email,
        name: account.name,
        avatar: account.avatar,
        role: account.role,
        memberId: account.memberId,
      });
    } catch (error) {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });
};
