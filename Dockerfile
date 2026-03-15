FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files from frontend/
COPY frontend/package.json frontend/package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy frontend source
COPY frontend/ .

# COWORK_API_URL baked into next.config.ts rewrites at build time
ARG COWORK_API_URL=http://backend.railway.internal:8888
ENV COWORK_API_URL=${COWORK_API_URL}

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Runtime COWORK_API_URL for API route handler
ENV COWORK_API_URL=http://backend.railway.internal:8888

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Railway injects PORT env var
ENV PORT=3333
EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3333}/ || exit 1

CMD ["node", "server.js"]

# Force rebuild: 20260315-auth-fix
