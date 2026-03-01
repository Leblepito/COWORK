#!/bin/bash
set -e

BACKEND_PORT=${BACKEND_PORT:-8888}
FRONTEND_PORT=${PORT:-3333}

# Start backend (FastAPI) in background
cd /app/cowork-army
PORT=$BACKEND_PORT python server.py &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend on port $BACKEND_PORT..."
for i in $(seq 1 30); do
    if python -c "import urllib.request; urllib.request.urlopen('http://localhost:${BACKEND_PORT}/api/info')" 2>/dev/null; then
        echo "Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "WARNING: Backend did not respond within 30s, starting frontend anyway..."
    fi
    sleep 1
done

# Start frontend (Next.js) in foreground
cd /app/cowork-army/frontend
exec npx next start --port $FRONTEND_PORT
