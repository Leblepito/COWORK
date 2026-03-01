#!/bin/bash
# COWORK.ARMY v7.0 — Local Development Start Script
# Usage: ./start.sh
set -e

echo "=== COWORK.ARMY v7.0 ==="
echo "Starting local development environment..."

# 1. Start PostgreSQL via Docker
echo "[1/4] PostgreSQL..."
docker compose up -d postgres
echo "  Waiting for PostgreSQL..."
sleep 3

# 2. Backend setup
echo "[2/4] Backend..."
cd backend
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

# Run migrations
export DATABASE_URL="postgresql+asyncpg://cowork:cowork_local_2024@localhost:5433/cowork"
alembic upgrade head 2>/dev/null || echo "  Migration skipped (may need DB)"

# Start backend in background
PORT=8888 python -m uvicorn main:app --host 0.0.0.0 --port 8888 --reload &
BACKEND_PID=$!
cd ..

# 3. Wait for backend
echo "[3/4] Waiting for backend..."
for i in $(seq 1 15); do
    if curl -s http://localhost:8888/api/info > /dev/null 2>&1; then
        echo "  Backend ready!"
        break
    fi
    sleep 1
done

# 4. Frontend
echo "[4/4] Frontend..."
cd frontend
npm install --legacy-peer-deps 2>/dev/null
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=== COWORK.ARMY v7.0 RUNNING ==="
echo "  Frontend:  http://localhost:3333"
echo "  Backend:   http://localhost:8888"
echo "  PostgreSQL: localhost:5433"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker compose stop postgres; exit" SIGINT SIGTERM
wait
