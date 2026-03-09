@echo off
REM Homeopathy Backend Environment Setup Script for Windows
REM This script creates a Python virtual environment and installs dependencies

echo.
echo =========================================
echo Homeopathy Backend - Environment Setup
echo =========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo [1/4] Python found. Creating virtual environment...
if exist venv (
    echo Virtual environment already exists. Removing old one...
    rmdir /s /q venv
)
python -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

echo [3/4] Installing Python dependencies...
python -m pip install --upgrade pip setuptools wheel >nul
pip install -r ..\requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo [4/4] Initializing database...
python scripts\init_db.py
if %errorlevel% neq 0 (
    echo WARNING: Database initialization had issues, but setup continues
    echo You may need to run: python scripts\init_db.py manually
)

echo.
echo =========================================
echo Setup Complete!
echo =========================================
echo.
echo To start the backend server, run:
echo   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
echo.
echo Or use the included run-backend.bat script
echo.
pause
