FROM node:20-alpine AS builder
WORKDIR /app
COPY cowork-army/frontend/package.json cowork-army/frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY cowork-army/frontend/ .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3333
ENV PORT=3333
CMD ["node", "server.js"]
