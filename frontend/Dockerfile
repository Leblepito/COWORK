FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# COWORK_API_URL: backend base URL for server-side proxy (set via Railway env vars)
# Railway private networking: http://backend.railway.internal:PORT
# Public fallback: https://backend-production-2161.up.railway.app
ENV COWORK_API_URL=https://backend-production-2161.up.railway.app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3333
ENV PORT=3333
CMD ["node", "server.js"]
