# TeamFlow Backend - Production Setup Guide

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- OAuth credentials (Google and GitHub)

## Environment Setup

### 1. MongoDB Setup (Recommended: MongoDB Atlas)

**Option A: MongoDB Atlas (Cloud - Recommended)**

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Create a new project
4. Create a cluster (free tier available)
5. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
6. Update `.env.local`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/teamflow?retryWrites=true&w=majority
   ```

**Option B: Local MongoDB**

1. Install MongoDB:
   ```bash
   # macOS with Homebrew
   brew install mongodb-community
   brew services start mongodb-community
   
   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. Update `.env.local`:
   ```
   MONGODB_URI=mongodb://localhost:27017/teamflow
   ```

### 2. OAuth Credentials Setup

#### Google OAuth

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:4000/api/v1/auth/google/callback`
5. Copy Client ID and Client Secret to `.env.local`

#### GitHub OAuth

1. Go to GitHub Settings: https://github.com/settings/developers
2. Create a New OAuth App
3. Fill in the form:
   - Application name: TeamFlow
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:4000/api/v1/auth/github/callback`
4. Copy Client ID and Client Secret to `.env.local`

### 3. Environment Configuration

Create/update `.env.local` with:

```env
# Server
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/teamflow?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# Frontend
FRONTEND_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

## Running the Server

### Development

```bash
npm run dev
```

Server will start at `http://localhost:4000`

### Production Build

```bash
npm run build
npm run start
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/login` - Email login
- `POST /api/v1/auth/register` - Email registration
- `GET /api/v1/auth/google/start` - Start Google OAuth flow
- `POST /api/v1/auth/google/callback` - Google OAuth callback
- `GET /api/v1/auth/github/start` - Start GitHub OAuth flow
- `POST /api/v1/auth/github/callback` - GitHub OAuth callback
- `GET /api/v1/auth/me` - Get current user

### Team Management

- `POST /api/v1/team/invite` - Invite user to workspace
- `POST /api/v1/team/accept-invitation` - Accept invitation
- `GET /api/v1/team/members/:workspaceId` - Get workspace members
- `DELETE /api/v1/team/members/:workspaceId` - Remove member

### Real-time

- `GET /api/v1/realtime/events` - Server-Sent Events stream for state invalidations
- `GET /api/v1/health` - Health check endpoint

## Features

### ✅ Authentication
- Email/password authentication with bcrypt hashing
- Google OAuth integration
- GitHub OAuth integration  
- JWT token-based sessions
- Token refresh and expiration (30 days)

### ✅ Team Collaboration
- User invitations with token-based links
- Team member management
- Role-based access control

### ✅ Real-time Synchronization
- Server-Sent Events (SSE) for state invalidation
- Automatic data sync across clients
- Graceful fallback to demo mode if backend unavailable

### ✅ Data Persistence
- MongoDB Atlas support for production
- Automatic index creation
- TTL indexes for automatic invitation expiration

## Troubleshooting

### MongoDB Connection Issues

If you see "MongoDB Connection Error":

1. Check your `MONGODB_URI` in `.env.local`
2. For Atlas: Verify IP whitelist includes your IP (or 0.0.0.0 for development)
3. Test connection: `mongosh "mongodb+srv://..."`
4. Check MongoDB Atlas dashboard for connection errors

### OAuth Not Working

1. Verify callback URLs match exactly (including protocol and port)
2. Check Client ID and Secret are correct
3. Ensure CORS_ORIGIN includes your frontend URL
4. Check browser console for detailed error messages

### Port Already in Use

```bash
# Kill process on port 4000
lsof -i :4000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

## Next Steps

1. Start the frontend server (see frontend README)
2. Visit http://localhost:3000
3. Test login with email, Google, or GitHub
4. Create a workspace and invite team members
5. Test real-time sync by opening the app in multiple windows
