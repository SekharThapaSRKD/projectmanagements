# TeamFlow Backend

Fastify + TypeScript backend for TeamFlow.

Architecture goals:
- High performance request handling with Fastify
- Clear separation between transport, service, and persistence layers
- Durable JSON-file persistence for local development and demo deployments
- API-first contract for auth, workspace data, analytics, and chat
- Production-ready middleware: CORS, compression, rate limiting, helmet, and OpenAPI docs

Run locally:
- Copy `.env.example` to `.env`
- `npm install`
- `npm run dev`

API surface:
- `/health`
- `/auth/email/login`
- `/auth/email/register`
- `/oauth/:provider/start`
- `/oauth/:provider/callback`
- `/api/v1/*` for workspaces, projects, tasks, sprints, members, messages, documents, channels, analytics, and search
- `/api/v1/realtime/events` for server-sent invalidation events when data changes

The backend is designed so the persistence layer can later be swapped from JSON storage to PostgreSQL, MongoDB, or Prisma without changing route contracts.
