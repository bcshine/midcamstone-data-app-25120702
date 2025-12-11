@echo off
chcp 65001 >nul
title MIDCAM 로컬 서버 종료

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          🛑 MIDCAM 로컬 서버 종료                           ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo [1/2] Next.js 서버 종료 중...
taskkill /F /FI "WINDOWTITLE eq Next.js Dev Server*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

echo [2/2] Python 서버 종료 중...
taskkill /F /FI "WINDOWTITLE eq Python API Server*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

echo.
echo ✅ 모든 서버가 종료되었습니다.
echo.
pause

