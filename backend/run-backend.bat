@echo off
REM Start Homeopathy Backend Development Server
REM Make sure setup-env.bat has been run first

if not exist venv (
    echo.
    echo ERROR: Virtual environment not found!
    echo Please run setup-env.bat first to initialize the environment.
    echo.
    pause
    exit /b 1
)

echo.
echo =========================================
echo Starting Homeopathy Backend Server
echo =========================================
echo.
echo Backend will be available at: http://127.0.0.1:8000
echo API Docs at: http://127.0.0.1:8000/docs
echo.
echo Press CTRL+C to stop the server
echo.

call venv\Scripts\activate.bat
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
