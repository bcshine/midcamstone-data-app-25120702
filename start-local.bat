@echo off
chcp 65001 >nul
title MIDCAM 로컬 서버 시작

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          🚀 MIDCAM 로컬 개발 서버 시작                      ║
echo ║                                                              ║
echo ║   Next.js:     http://localhost:3000                        ║
echo ║   Python API:  http://localhost:8000                        ║
echo ║   API 문서:    http://localhost:8000/docs                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo [1/2] 🐍 Python FastAPI 서버 시작 중...
start "Python API Server" cmd /k "cd /d %~dp0scripts\api && .\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] ⚡ Next.js 개발 서버 시작 중...
start "Next.js Dev Server" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ✅ 서버 시작 완료!
echo.
echo 브라우저에서 http://localhost:3000 으로 접속하세요.
echo.
echo 서버를 종료하려면 열린 터미널 창들을 닫으세요.
echo.
pause

