from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import os

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
os.makedirs(DATA_DIR, exist_ok=True)


@router.post("/csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    dest = DATA_DIR / file.filename
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return {"filename": file.filename, "saved_to": str(dest)}
