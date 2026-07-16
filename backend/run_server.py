import multiprocessing
import uvicorn
import os
import sys

# Ensure PyInstaller frozen environment is handled
if getattr(sys, 'frozen', False):
    # When running as compiled executable, set working directory
    # so that .env and homeopathy.db are found in the same folder as the .exe
    os.chdir(os.path.dirname(sys.executable))

from app.main import app

if __name__ == "__main__":
    multiprocessing.freeze_support()
    print("Starting Homeopathy Case Manager Backend Server...")
    print("Server running at: http://127.0.0.1:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
