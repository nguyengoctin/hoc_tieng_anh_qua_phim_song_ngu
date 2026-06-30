@echo off
title Friends English Center Launcher
echo ===================================================
echo   Friends English Center Launcher (Windows version)
echo ===================================================

:: Check for .env file
if not exist .env (
    echo [WARNING] .env file not found. AI features might not work without GEMINI_API_KEY.
    echo Creating a template .env file...
    echo GEMINI_API_KEY=your_gemini_api_key_here > .env
)

:: Activate python venv
if exist venv\Scripts\activate.bat (
    echo [INFO] Activating Python virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo [WARNING] Python virtual environment (venv) not found.
    echo Please make sure you have installed dependencies inside your python environment.
)

:: Start Backend in a new window
echo [INFO] Starting Backend Server (FastAPI on Port 8000)...
start "Backend - FastAPI" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Start Frontend
echo [INFO] Starting Frontend Dev Server (Vite)...
cd frontend
start "Frontend - React Vite" cmd /k "npm run dev"

echo ===================================================
echo [SUCCESS] Both servers are starting up.
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:8000
echo ===================================================
pause
