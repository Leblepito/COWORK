FROM python:3.12-slim

WORKDIR /srv

# When rootDirectory=backend, build context is backend/ folder
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files into a 'backend' package directory
# This preserves relative imports (from .config, from .database, etc.)
RUN mkdir -p backend
COPY . ./backend/

# Create workspace
RUN mkdir -p backend/workspace

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8888}/api/info')" || exit 1

# Run migrations (from backend dir for alembic.ini) then start uvicorn (from /srv for package imports)
CMD cd /srv/backend && (alembic upgrade head 2>&1 && echo "Migrations OK" || echo "Migration skipped") ; \
    cd /srv && python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8888}

# Force rebuild: 20260315-auth-package-fix
