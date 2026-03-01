FROM python:3.12-slim

WORKDIR /srv

# Install dependencies first (layer caching)
COPY requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source into package directory
COPY . ./backend/

# Create workspace directories
RUN mkdir -p backend/workspace

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8888}/api/info')" || exit 1

# Alembic runs from backend/ (needs "from database.models import Base")
# Uvicorn runs from /srv (needs "backend.main:app" for relative imports)
CMD cd /srv/backend && alembic upgrade head 2>/dev/null; cd /srv && python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8888}
