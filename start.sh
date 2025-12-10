#!/bin/sh

# =====================================================
# 프로덕션 시작 스크립트
# Python FastAPI + Next.js 동시 실행
# =====================================================

echo "Starting Python API server..."
cd /app/scripts/api
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
PYTHON_PID=$!

echo "Waiting for Python API to start..."
sleep 3

echo "Starting Next.js server..."
cd /app
# Railway의 PORT 환경 변수 사용 (기본값 3000)
PORT=${PORT:-3000} node server.js &
NEXTJS_PID=$!

echo "Both servers started successfully!"
echo "Python API PID: $PYTHON_PID (port 8000)"
echo "Next.js PID: $NEXTJS_PID (port $PORT)"

# 두 프로세스 중 하나라도 종료되면 스크립트 종료
wait -n
exit $?

