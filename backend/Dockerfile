FROM python:3.12-slim

WORKDIR /srv

# rootDirectory=backend → build context is the backend/ folder
# So all paths are relative to backend/
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend source files
COPY . ./

# Create workspace directories
RUN mkdir -p workspace

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8888}/api/info')" || exit 1

# Run alembic migrations then start uvicorn
# Since rootDir=backend, we're already in the backend context
# Uvicorn needs to find main:app at the top level of /srv
CMD alembic upgrade head 2>/dev/null; python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8888}

# Cache bust: 20260313-rootdir-backend

# Force rebuild: 20260313-105353
