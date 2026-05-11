# TeamFlow - Complete Installation & Setup Guide

## 🎯 Overview

TeamFlow is a production-ready team collaboration platform with real-time chat, Kanban/Scrum boards, and multi-user workspace management.

**Key Features:**
- ✅ Real-time team collaboration
- ✅ Kanban & Scrum project management
- ✅ Team chat and messaging
- ✅ Google & GitHub OAuth authentication
- ✅ Email/password authentication
- ✅ Team member invitations
- ✅ Role-based access control
- ✅ MongoDB data persistence
- ✅ Multi-user support

---

## 📋 Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn**
- **MongoDB** (via MongoDB Atlas - free tier available)
- **GitHub Account** (for OAuth credentials)
- **Google Account** (for OAuth credentials)

---

## 🚀 Step 1: Get OAuth Credentials

### Google OAuth Setup

1. Go to: https://console.cloud.google.com
2. Create a new project
3. Enable the Google+ API
4. Go to Credentials → Create OAuth 2.0 credentials
5. Select "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:4000/api/v1/auth/google/callback`
   - `http://localhost:3000/api/auth/callback/google`
7. Copy **Client ID** and **Client Secret**

### GitHub OAuth Setup

1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the form:
   - **Application name**: TeamFlow
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:4000/api/v1/auth/github/callback`
4. Copy **Client ID** and **Client Secret**

### Save Credentials Securely
```
Google Client ID: ___________
Google Client Secret: ___________
GitHub Client ID: ___________
GitHub Client Secret: ___________
```

---

## 🌍 Step 2: Set Up MongoDB Atlas

### Create MongoDB Cluster

1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Create a new project
4. Create a cluster:
   - Select **M0 (Free Tier)**
   - Select your preferred region
   - Click "Create"
5. Wait for cluster to deploy (5-10 minutes)

### Get Connection String

1. Click "Connect" on your cluster
2. Select "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Format: `mongodb+srv://username:password@cluster.mongodb.net/teamflow?retryWrites=true&w=majority`

---

## 💻 Step 3: Backend Setup

### Clone and Navigate

```bash
cd backend
npm install
```

### Create .env.local

Create `.env.local` file in the backend folder:

```env
# Server
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/teamflow?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-key-here-min-32-chars

# Frontend
FRONTEND_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-min-32-chars

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# GitHub OAuth
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

### Build Backend

```bash
npm run build
```

### Start Backend (Development)

```bash
npm run dev
```

Expected output:
```
Server listening at http://127.0.0.1:4000
Server listening at http://10.x.x.x:4000
✓ MongoDB connected and indexes created
```

---

## 🎨 Step 4: Frontend Setup

### Clone and Navigate

```bash
cd frontend
npm install
```

### Create .env.local

Create `.env.local` file in the frontend folder:

```env
# Backend
NEXT_PUBLIC_AUTH_PROVIDER_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000

# OAuth Client IDs (from Google & GitHub setup)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret-key-min-32-chars
NEXTAUTH_URL=http://localhost:3000
```

### Start Frontend (Development)

```bash
npm run dev
```

Expected output:
```
  ▲ Next.js 16.2.4
  - Local:        http://localhost:3000
  - Ready in 359ms
```

---

## 🧪 Step 5: Test the Application

### Open Browser

Visit: http://localhost:3000

### Test Email Signup

1. Click "Sign up with email"
2. Enter:
   - **Name**: John Doe
   - **Email**: john@example.com
   - **Password**: any_password_123
3. Click "Create account"
4. You should be logged in

### Test Email Login

1. Log out (top right menu)
2. Click "Sign in"
3. Enter your credentials
4. Click "Continue"

### Test Google Login

1. Log out
2. Click "Google" button
3. Authenticate with your Google account
4. You should be logged in

### Test GitHub Login

1. Log out
2. Click "GitHub" button
3. Authorize the application
4. You should be logged in

---

## 👥 Step 6: Test Multi-User Features

### Create a Workspace

1. Click "Create workspace"
2. Name: "My Dev Team"
3. Click "Create"

### Invite Team Member

1. Click "Add Member"
2. Enter: `friend@example.com`
3. Click "Send invitation"
4. Copy the invitation URL

### Accept Invitation (Different User)

1. Open a new incognito/private browser window
2. Sign up with: `friend@example.com` / `password123`
3. Paste the invitation URL
4. Click "Accept"
5. You now have access to "My Dev Team" workspace

### Real-time Collaboration

**User 1 (Original creator):**
1. Create a task: "Build login form"
2. Create another task: "Build dashboard"

**User 2 (Invited member) - Without refreshing:**
3. Should see the tasks appear in real-time
4. Create a task: "Design database schema"

**User 1 - Without refreshing:**
5. Should see the task appear in real-time

### Test Chat

1. Click "Chat" in the left sidebar
2. Type a message in the input field
3. Press "Send"
4. Switch to other user's window (or other tab)
5. Should see the message in real-time

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error: "MongoDB Connection Error"**

1. Check `MONGODB_URI` in `.env.local`
2. Verify MongoDB Atlas IP whitelist:
   - Go to MongoDB Atlas
   - Network Access → Add IP Address
   - Add `0.0.0.0/0` for development
3. Test connection:
   ```bash
   npm install -g mongosh
   mongosh "your_mongodb_uri"
   ```

**Error: "Port 4000 already in use"**

```bash
# Kill process on port 4000
lsof -i :4000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Frontend Won't Start

**Error: "Port 3000 already in use"**

```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### OAuth Not Working

1. Check callback URLs match exactly (including protocol and port)
2. Verify Client IDs and Secrets are correct
3. Check CORS is configured: `CORS_ORIGIN=http://localhost:3000`
4. Check browser console (F12) for detailed error messages

### Real-time Not Updating

1. Check `/api/v1/realtime/events` is working:
   ```bash
   curl -N http://localhost:4000/api/v1/realtime/events
   ```
2. Should see: `event: connected`
3. If not, check CORS headers

---

## 📦 Building for Production

### Backend Production Build

```bash
cd backend
npm run build
NODE_ENV=production npm run start
```

### Frontend Production Build

```bash
cd frontend
npm run build
npm run start
```

### Environment Variables for Production

```env
# Backend
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

# Update OAuth redirect URLs to production domain
# Update all callback URLs in Google & GitHub settings

# Use strong secrets (min 32 characters, random)
JWT_SECRET=<generate-strong-random-secret>
NEXTAUTH_SECRET=<generate-strong-random-secret>
```

---

## 🚀 Deploying to Cloud

### Deploy Backend (Heroku Example)

```bash
cd backend
heroku create teamflow-backend
heroku config:set MONGODB_URI=mongodb+srv://...
heroku config:set JWT_SECRET=<random-secret>
git push heroku main
```

### Deploy Frontend (Vercel Example)

```bash
cd frontend
# Connect to Vercel and set environment variables
vercel deploy --prod
```

### Update OAuth Redirect URLs

After deploying, update in Google and GitHub:

**Google Cloud Console:**
- Authorized redirect URIs:
  - `https://yourdomain-backend.herokuapp.com/api/v1/auth/google/callback`
  - `https://yourdomain-frontend.vercel.app/api/auth/callback/google`

**GitHub Settings:**
- Authorization callback URL:
  - `https://yourdomain-backend.herokuapp.com/api/v1/auth/github/callback`

---

## 📚 API Reference Quick Start

### Authenticate

```bash
# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Response includes token
{"token":"eyJhbGc...","user":{...}}
```

### Use Token

```bash
# Get current user
curl -H "Authorization: Bearer eyJhbGc..." \
  http://localhost:4000/api/v1/auth/me
```

### Invite Team Member

```bash
curl -X POST http://localhost:4000/api/v1/team/invite \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"ws_123","email":"friend@example.com","role":"member"}'
```

---

## ✅ Production Checklist

- [ ] Update `JWT_SECRET` to secure random value
- [ ] Update `NEXTAUTH_SECRET` to secure random value
- [ ] Set `NODE_ENV=production`
- [ ] Configure MongoDB Atlas IP whitelist for production IPs only
- [ ] Update OAuth redirect URLs for production domain
- [ ] Enable HTTPS for all URLs
- [ ] Set up monitoring and error tracking
- [ ] Enable MongoDB backups
- [ ] Configure domain name in `CORS_ORIGIN`
- [ ] Set up email service for invitations (optional)
- [ ] Configure rate limiting for production load
- [ ] Set up CI/CD pipeline for auto-deployment

---

## 🎓 Learning Resources

- **MongoDB**: https://docs.mongodb.com/manual/
- **Fastify**: https://www.fastify.io/docs/latest/
- **Next.js**: https://nextjs.org/docs
- **OAuth 2.0**: https://oauth.net/2/
- **TypeScript**: https://www.typescriptlang.org/docs/

---

## 📞 Support

For issues, check:
1. The troubleshooting section above
2. `backend/SETUP.md` for backend-specific help
3. Console logs (F12 in browser)
4. MongoDB Atlas dashboard for connection issues

---

## 🎉 Congratulations!

You now have a fully functional, production-ready team collaboration platform with:
- Real-time synchronization
- Secure authentication
- Multi-user workspace management
- Chat and project management features

**Happy collaborating! 🚀**
