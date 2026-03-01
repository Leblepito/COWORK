FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY . .

# Run alembic migrations then start uvicorn
# Railway provides $PORT env var
CMD alembic upgrade head && python -m uvicorn server:app --host 0.0.0.0 --port ${PORT:-8888}
