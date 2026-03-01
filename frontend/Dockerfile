FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
# COWORK_API_URL baked into next.config.ts rewrites at build time
ARG COWORK_API_URL=http://backend.railway.internal:8888
ENV COWORK_API_URL=${COWORK_API_URL}
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Runtime COWORK_API_URL for API route handler (overridden by Railway env vars)
ENV COWORK_API_URL=http://backend.railway.internal:8888
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3333
ENV PORT=3333
CMD ["node", "server.js"]
