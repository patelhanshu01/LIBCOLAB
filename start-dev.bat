@echo off
REM LibColab - Local Development Startup Script for Windows
REM This script starts both backend and frontend servers for local development

setlocal enabledelayedexpansion

echo.
echo 🚀 LibColab - Local Development Environment
echo ===========================================
echo.

REM Set the project root
set "PROJECT_ROOT=%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js found: %NODE_VERSION%

REM Check if Python 3 is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python 3 is not installed. Please install Python 3 from https://www.python.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✅ Python found: %PYTHON_VERSION%

echo.
echo ℹ️  Starting services...
echo.

REM Start backend
echo ℹ️  Setting up backend...
cd /d "%PROJECT_ROOT%backend"

REM Check if virtual environment exists
if not exist "venv" (
    echo ⚠️  Virtual environment not found. Creating...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install requirements
echo ℹ️  Installing Python dependencies...
pip install -q -r requirements.txt

REM Start backend in a new window
echo ℹ️  Launching backend server on http://localhost:8000...
start "LibColab Backend" cmd /k "python server.py"

REM Wait for backend to start
timeout /t 2 /nobreak

REM Start frontend
echo ℹ️  Starting frontend...
cd /d "%PROJECT_ROOT%frontend"

REM Check if node_modules exists
if not exist "node_modules" (
    echo ⚠️  Dependencies not found. Installing...
    call npm install
)

REM Start frontend in a new window
echo ℹ️  Launching frontend server on http://localhost:3000...
start "LibColab Frontend" cmd /k "call npm start"

REM Wait for frontend to start
timeout /t 2 /nobreak

echo.
echo =========================================
echo ✅ All services started successfully!
echo =========================================
echo.
echo 📍 Services are available at:
echo    • Frontend:     http://localhost:3000
echo    • Backend API:  http://localhost:8000
echo    • API Docs:     http://localhost:8000/docs
echo.
echo 📝 Services are running in separate windows above
echo.
echo 💡 Tips:
echo    • Check backend logs in the "LibColab Backend" window
echo    • Check frontend logs in the "LibColab Frontend" window
echo    • API documentation: http://localhost:8000/docs
echo    • Frontend will auto-reload on code changes
echo.
echo Close the windows or press Ctrl+C to stop services
pause
