FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY cowork-army/frontend/package.json cowork-army/frontend/package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy frontend source
COPY cowork-army/frontend/ .

# Next.js needs NEXT_PUBLIC_* env vars at build time
ARG NEXT_PUBLIC_COWORK_API_URL
ENV NEXT_PUBLIC_COWORK_API_URL=${NEXT_PUBLIC_COWORK_API_URL}

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copy public directory if it exists
COPY --from=builder /app/public ./public

# Railway injects PORT env var
ENV PORT=3333
EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3333}/ || exit 1

CMD ["node", "server.js"]
