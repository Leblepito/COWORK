FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY . .

# Healthcheck for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8888}/api/info')" || exit 1

# Run alembic migrations then start uvicorn
# Railway provides $PORT env var
CMD alembic upgrade head && python -m uvicorn server:app --host 0.0.0.0 --port ${PORT:-8888}
