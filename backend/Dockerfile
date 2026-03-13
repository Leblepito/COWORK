FROM python:3.12-slim

WORKDIR /srv

# Install dependencies first (layer caching)
# dockerfilePath=backend/Dockerfile → build context is repo root
# Copy only backend/ subdirectory to avoid double-nesting (/srv/backend/backend)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source into /srv/backend/
COPY backend/ ./backend/

# Create workspace directories
RUN mkdir -p backend/workspace

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8888}/api/info')" || exit 1

# Alembic runs from backend/ (needs "from database.models import Base")
# Uvicorn runs from /srv (needs "backend.main:app" for relative imports)
CMD cd /srv/backend && alembic upgrade head 2>/dev/null; cd /srv && python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8888}

# Cache bust: 20260313-fixed-dockerfile
