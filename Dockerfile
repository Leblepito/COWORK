# Stage 1: Build frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/cowork-army/frontend
COPY cowork-army/frontend/package.json cowork-army/frontend/package-lock.json ./
RUN npm ci
COPY cowork-army/frontend/ ./
ENV NEXT_TURBOPACK=0
RUN npm run build

# Stage 2: Production image
FROM python:3.11-slim
WORKDIR /app

# Install Node.js 20
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get purge -y curl && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY cowork-army/requirements.txt /app/cowork-army/
RUN pip install --no-cache-dir -r /app/cowork-army/requirements.txt

# Copy backend source
COPY cowork-army/*.py /app/cowork-army/

# Copy frontend build + production deps
COPY --from=frontend-build /app/cowork-army/frontend/.next /app/cowork-army/frontend/.next
COPY --from=frontend-build /app/cowork-army/frontend/node_modules /app/cowork-army/frontend/node_modules
COPY --from=frontend-build /app/cowork-army/frontend/package.json /app/cowork-army/frontend/
COPY cowork-army/frontend/public /app/cowork-army/frontend/public
COPY cowork-army/frontend/next.config.ts /app/cowork-army/frontend/
COPY cowork-army/frontend/tsconfig.json /app/cowork-army/frontend/

# Copy start script
COPY start.sh /app/
RUN chmod +x /app/start.sh

ENV NODE_ENV=production
ENV COWORK_API_URL=http://localhost:8888

EXPOSE 3333

CMD ["/app/start.sh"]
