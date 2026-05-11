# Frontend Dockerfile
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# We need to set the public variables at build time for Next.js
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AUTH_PROVIDER_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_AUTH_PROVIDER_URL=$NEXT_PUBLIC_AUTH_PROVIDER_URL

RUN npm run build

FROM node:20-slim

WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
