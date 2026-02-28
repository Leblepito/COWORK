#!/bin/bash
set -e

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
    sleep 1
done

# Start frontend (Next.js) in foreground
# Railway injects PORT env var — frontend uses it
cd /app/cowork-army/frontend
exec ./node_modules/.bin/next start --port ${PORT:-3333}
