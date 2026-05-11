# TeamFlow - Production-Ready Collaboration Platform

A complete team collaboration app with real-time chat, Kanban boards, and multi-user workspace management.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (use MongoDB Atlas for cloud)
- Google and GitHub OAuth credentials

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env.local with:
# MONGODB_URI=your_mongodb_atlas_connection_string
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
# NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
# GITHUB_CLIENT_SECRET=your_github_client_secret

# Run development server
npm run dev
# Server starts at http://localhost:4000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local with:
# NEXT_PUBLIC_AUTH_PROVIDER_URL=http://localhost:4000
# NEXT_PUBLIC_API_URL=http://localhost:4000
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
# NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id

# Run development server
npm run dev
# App starts at http://localhost:3000
```

### 3. Open Browser

Visit http://localhost:3000 and sign up with:
- **Email**: test@example.com / **Password**: any password
- **Google**: Click Google button and authenticate
- **GitHub**: Click GitHub button and authenticate

## ✨ Features

### Authentication
- ✅ Email/Password signup and login
- ✅ Google OAuth 2.0 integration
- ✅ GitHub OAuth 2.0 integration
- ✅ Secure JWT token management
- ✅ Session persistence

### Team Collaboration
- ✅ Create and manage workspaces
- ✅ Invite team members by email
- ✅ Role-based access control (Owner, Admin, Member)
- ✅ Team member management interface

### Project Management
- ✅ Create Kanban and Scrum projects
- ✅ Drag-and-drop task management
- ✅ Task assignments and comments
- ✅ Sprint planning and tracking
- ✅ Project analytics and burndown charts

### Communication
- ✅ Real-time team chat
- ✅ Project-specific channels
- ✅ Direct messaging
- ✅ Message history and persistence

### Real-time Sync
- ✅ Server-Sent Events (SSE) for live updates
- ✅ Automatic state sync across all clients
- ✅ Multi-user support without page refresh

### Data Management
- ✅ MongoDB persistence
- ✅ Automatic backups via MongoDB Atlas
- ✅ Full data portability

## 📁 Project Structure

```
teamproject/
├── frontend/                 # Next.js 16 React app
│   ├── app/                 # App router
│   ├── components/          # React components
│   ├── lib/                 # Utilities and stores
│   └── app/api/auth/        # OAuth callback handlers
├── backend/                 # Fastify TypeScript server
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── config/          # Configuration
│   │   └── types/           # TypeScript types
│   └── SETUP.md            # Detailed setup guide
└── README.md
```

## 🔐 Security Features

- Bcrypt password hashing
- JWT token-based authentication
- OAuth 2.0 credential validation
- CORS protection
- Rate limiting on API endpoints
- Helmet security headers
- Secure session management

## 📊 API Documentation

### Authentication Endpoints

```bash
# Email Login
POST /api/v1/auth/login
{ "email": "user@example.com", "password": "password" }

# Email Registration
POST /api/v1/auth/register
{ "name": "John Doe", "email": "user@example.com", "password": "password" }

# Get Current User
GET /api/v1/auth/me
Header: Authorization: Bearer {token}

# Google OAuth Start
GET /api/v1/auth/google/start

# GitHub OAuth Start
GET /api/v1/auth/github/start
```

### Team Management Endpoints

```bash
# Invite Team Member
POST /api/v1/team/invite
{ "workspaceId": "ws_123", "email": "member@example.com", "role": "member" }

# Accept Invitation
POST /api/v1/team/accept-invitation
{ "token": "inv_token_here" }

# Get Workspace Members
GET /api/v1/team/members/{workspaceId}

# Remove Team Member
DELETE /api/v1/team/members/{workspaceId}
{ "memberId": "mem_123" }
```

### Real-time Endpoint

```bash
# Subscribe to state changes
GET /api/v1/realtime/events
# Returns: Server-Sent Event stream with state.invalidated events

# Health Check
GET /api/v1/health
```

## 🗄️ MongoDB Schema

```javascript
// Accounts (Users)
{
  id: "acct_xyz",
  email: "user@example.com",
  name: "John Doe",
  provider: "email" | "google" | "github",
  passwordHash: "bcrypt_hash",
  role: "owner" | "admin" | "member",
  avatar: "JD"
}

// Workspaces
{
  id: "ws_xyz",
  name: "Product Team",
  ownerId: "acct_xyz",
  memberIds: ["mem_1", "mem_2"],
  createdAt: timestamp
}

// Projects
{
  id: "proj_xyz",
  workspaceId: "ws_xyz",
  name: "Launchpad",
  type: "kanban" | "scrum",
  columns: [...],
  createdAt: timestamp
}

// Tasks
{
  id: "task_xyz",
  projectId: "proj_xyz",
  title: "Build login form",
  status: "todo" | "in_progress" | "in_review" | "done",
  priority: "low" | "medium" | "high" | "urgent",
  assigneeId: "mem_xyz",
  createdAt: timestamp
}

// Messages
{
  id: "msg_xyz",
  channelId: "chan_xyz",
  senderId: "mem_xyz",
  content: "Great progress today!",
  createdAt: timestamp
}

// Invitations
{
  id: "inv_xyz",
  workspaceId: "ws_xyz",
  email: "newmember@example.com",
  token: "unique_token",
  status: "pending" | "accepted" | "rejected",
  expiresAt: timestamp,
  createdAt: timestamp
}
```

## 🧪 Testing Multi-User Features

### Test Scenario: Team Collaboration

1. **User 1 Creates Workspace**
   ```
   Sign in as user1@example.com
   Create workspace "Dev Team"
   ```

2. **User 1 Invites User 2**
   ```
   Click "Add Member"
   Enter user2@example.com
   Send invitation
   ```

3. **User 2 Accepts Invitation**
   ```
   Sign in as user2@example.com
   Click invite link / Visit invitations page
   Accept invitation
   Join "Dev Team" workspace
   ```

4. **Real-time Collaboration**
   ```
   User 1: Create task "Build API"
   User 2: Create task "Build UI"
   Both see updates in real-time
   User 1: Send message in chat
   User 2: Sees message instantly
   ```

## 🚀 Deployment

### Deploy Backend (Heroku/Railway/Render)

```bash
# Set environment variables on hosting platform
MONGODB_URI=<your_atlas_uri>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google_id>
GOOGLE_CLIENT_SECRET=<google_secret>
# ... other vars

# Push to Git and deploy
git push heroku main
```

### Deploy Frontend (Vercel/Netlify)

```bash
# Set environment variables on hosting platform
NEXT_PUBLIC_AUTH_PROVIDER_URL=<backend_url>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google_id>
# ... other vars

# Deploy from Git
```

### Production Checklist

- [ ] Update JWT_SECRET to secure random value
- [ ] Update NEXTAUTH_SECRET to secure random value
- [ ] Configure MongoDB Atlas IP whitelist
- [ ] Update OAuth redirect URLs for production domain
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS for all URLs
- [ ] Configure proper CORS_ORIGIN for production domain
- [ ] Set up monitoring and alerting
- [ ] Enable MongoDB backups
- [ ] Configure email service for invitations

## 🐛 Troubleshooting

### MongoDB Connection Error
See `backend/SETUP.md` for detailed troubleshooting

### OAuth Not Working
1. Check callback URLs match exactly
2. Verify Client IDs and Secrets
3. Check browser console for errors
4. Test with `/api/auth/start/google` endpoint

### Real-time Not Updating
1. Check `/api/v1/realtime/events` is accessible
2. Check browser console for EventSource errors
3. Verify CORS_ORIGIN includes frontend URL

### Port Already in Use
```bash
# Kill process on port
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :4000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

## 📚 Additional Resources

- [MongoDB Atlas Setup Guide](https://docs.atlas.mongodb.com/getting-started/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Fastify Documentation](https://www.fastify.io/)
- [Next.js Documentation](https://nextjs.org/docs)

## 📝 License

MIT - Feel free to use for personal and commercial projects

## 💡 Support

For issues and questions, check the troubleshooting section or review the SETUP.md file in the backend folder.

---

**Ready to collaborate? Let's go! 🎉**
