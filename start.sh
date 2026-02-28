#!/bin/bash
set -e

# ── Backend (FastAPI on port 8888) ──────────────────
cd /app/cowork-army

# Start backend WITHOUT reload (production mode)
python -m uvicorn server:app --host 0.0.0.0 --port 8888 &
BACKEND_PID=$!

# Wait for backend to be ready (max 30s)
echo "[start.sh] Waiting for backend on port 8888..."
for i in $(seq 1 30); do
    if python -c "import urllib.request; urllib.request.urlopen('http://localhost:8888/health')" 2>/dev/null; then
        echo "[start.sh] Backend is ready! (PID: $BACKEND_PID)"
        break
    fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "[start.sh] ERROR: Backend process died!"
        exit 1
    fi
    sleep 1
done

# Verify backend is actually running
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "[start.sh] ERROR: Backend is not running!"
    exit 1
fi

# ── Frontend (Next.js on $PORT or 3333) ─────────────
cd /app/cowork-army/frontend

# Monitor backend — if it dies, kill frontend too
(
    while kill -0 "$BACKEND_PID" 2>/dev/null; do
        sleep 5
    done
    echo "[start.sh] Backend died, shutting down container..."
    kill $$ 2>/dev/null
) &

# Start frontend in foreground using node directly (not npx)
exec node_modules/.bin/next start --port "${PORT:-3333}"
