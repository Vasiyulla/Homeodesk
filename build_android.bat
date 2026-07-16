@echo off
echo ============================================================
echo   Homeopathy Case Manager — Android APK Build Pipeline
echo ============================================================
echo.

:: Ensure directories exist
if not exist "frontend\public\assets\databases" (
    echo [INFO] Creating frontend database assets directory...
    mkdir "frontend\public\assets\databases"
)
if not exist "frontend\android\app\src\main\assets\databases" (
    echo [INFO] Creating Android assets database directory...
    mkdir "frontend\android\app\src\main\assets\databases"
)

:: Step 1: Check if Android DB exists, if not generate it
if not exist "backend\homeopathy_android.db" (
    echo [INFO] Android database not found. Generating...
    call c:\Users\Dell\Documents\SIH\env\Scripts\python.exe backend\scripts\prepare_android_db.py
) else (
    echo [OK] Found existing Android database.
)

:: Step 2: Copy SQLite DB to Frontend Assets & Android Project Assets
echo [INFO] Copying SQLite database to assets...
copy /Y "backend\homeopathy_android.db" "frontend\public\assets\databases\homeopathy_android.db"
copy /Y "backend\homeopathy_android.db" "frontend\android\app\src\main\assets\databases\homeopathy_android.db"

:: Step 3: Build Vite React Frontend
echo [INFO] Building Vite React frontend...
cd frontend
call npm run build

:: Step 4: Capacitor Sync
echo [INFO] Syncing assets to Capacitor Android project...
call npx cap sync android

:: Step 5: Build Gradle Debug APK
echo [INFO] Running Gradle build for Android Debug APK...
cd android
call .\gradlew.bat assembleDebug

echo.
echo ============================================================
echo   Build finished!
echo   Your fully offline Android debug APK is located at:
echo   frontend\android\app\build\outputs\apk\debug\app-debug.apk
echo ============================================================
cd ..\..
