@echo off
echo Building Homeopathy Backend Server Executable using correct Virtual Environment...

c:\Users\Dell\Documents\SIH\env\Scripts\python.exe -m PyInstaller ^
    --name="server" ^
    --onefile ^
    --clean ^
    --hidden-import="passlib.handlers.bcrypt" ^
    --hidden-import="sqlalchemy.dialects.sqlite" ^
    --hidden-import="uvicorn.logging" ^
    --hidden-import="uvicorn.loops" ^
    --hidden-import="uvicorn.loops.auto" ^
    --hidden-import="uvicorn.protocols" ^
    --hidden-import="uvicorn.protocols.http" ^
    --hidden-import="uvicorn.protocols.http.auto" ^
    --hidden-import="uvicorn.protocols.websockets" ^
    --hidden-import="uvicorn.protocols.websockets.auto" ^
    --hidden-import="uvicorn.lifespan" ^
    --hidden-import="uvicorn.lifespan.on" ^
    --hidden-import="multipart" ^
    --hidden-import="slowapi" ^
    run_server.py

echo.
echo Build complete! Your server.exe is in the "dist" folder.
echo Make sure to copy .env and homeopathy.db to the dist folder before running.
