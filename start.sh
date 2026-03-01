#!/bin/bash
set -e

echo "=== COWORK.ARMY Starting ==="
echo "PORT=${PORT:-3333} | NODE_ENV=${NODE_ENV}"

# Start backend (FastAPI) in background
cd /app/cowork-army
python server.py &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend on port 8888..."
for i in $(seq 1 30); do
    if python -c "import urllib.request; urllib.request.urlopen('http://localhost:8888/api/agents')" 2>/dev/null; then
        echo "Backend is ready!"
        break
    fi
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "WARNING: Backend process exited early"
        break
    fi
    sleep 1
done

# Start frontend (Next.js) in foreground
cd /app/cowork-army/frontend
echo "Starting Next.js on 0.0.0.0:${PORT:-3333}..."
exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port ${PORT:-3333}
