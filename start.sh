#!/bin/sh

# =====================================================
# 프로덕션 시작 스크립트
# Python FastAPI + Next.js 동시 실행
# =====================================================

echo "=== Starting Python API server (background) ==="
cd /app/scripts/api
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &

echo "Waiting for Python API to start..."
sleep 2

echo "=== Starting Next.js server (foreground) ==="
cd /app
# Railway의 PORT 환경 변수 사용 - exec로 포그라운드 실행
exec node server.js

