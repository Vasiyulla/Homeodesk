"""
Repertory Data Seeder

Loads normalized homeopathic repertory data (Kent / Boger) from JSON files
into the database 'repertory' table.
Uses PostgreSQL ON CONFLICT DO NOTHING for fast bulk inserts.

Usage:
    python scripts/seed_repertory.py                           # Load all JSON from data/normalized/
    python scripts/seed_repertory.py --file path/to/data.json  # Load a specific file
    python scripts/seed_repertory.py --clear                   # Clear repertory table first
    python scripts/seed_repertory.py --dry-run                 # Preview without inserting
"""
import sys
import json
import argparse
import logging
from pathlib import Path
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

from app.db.database import SessionLocal, engine
from app.db.models import Repertory

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("seed_repertory")


def normalize_entry(raw: dict, default_source: str = "unknown") -> dict:
    """
    Normalize a raw JSON entry into a standard format.
    Supports multiple field naming conventions.
    """
    return {
        "chapter": raw.get("chapter") or raw.get("section") or raw.get("Chapter") or "",
        "main_rubric": raw.get("main_rubric") or raw.get("rubric") or raw.get("Rubric") or "",
        "sub_condition": raw.get("sub_condition") or raw.get("sub_rubric") or raw.get("Sub_rubric") or "",
        "remedy": raw.get("remedy") or raw.get("Remedy") or "",
        "grade": int(raw.get("grade") or raw.get("Grade") or 1),
        "source": raw.get("source") or raw.get("Source") or default_source,
    }


def load_json_file(file_path: Path) -> list:
    """Load and parse a JSON file."""
    logger.info(f"Reading: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        return data
    elif isinstance(data, dict):
        for key in ["entries", "data", "rubrics", "items"]:
            if key in data and isinstance(data[key], list):
                return data[key]
        return [data]
    else:
        logger.warning(f"Unexpected format in {file_path}")
        return []


def seed_from_file(file_path: Path, dry_run: bool = False) -> dict:
    """
    Load repertory entries from a single JSON file into the database.
    """
    entries = load_json_file(file_path)
    if not entries:
        logger.warning(f"No entries found in {file_path}")
        return {"file": str(file_path), "total": 0, "inserted": 0, "errors": 0}

    stem = file_path.stem.lower()
    if "kent" in stem:
        default_source = "kent"
    elif "boger" in stem:
        default_source = "boger"
    else:
        default_source = "unknown"

    logger.info(f"Found {len(entries)} entries (default source: {default_source})")

    if dry_run:
        for i, raw in enumerate(entries[:5]):
            norm = normalize_entry(raw, default_source)
            logger.info(f"  [{i+1}] {norm['chapter']}/{norm['main_rubric']}/{norm['sub_condition']} → {norm['remedy']} (grade {norm['grade']}, {norm['source']})")
        logger.info(f"  ... and {len(entries) - 5} more entries")
        return {"file": str(file_path), "total": len(entries), "inserted": 0, "errors": 0, "dry_run": True}

    db = SessionLocal()
    stats = {"file": str(file_path), "total": len(entries), "inserted": 0, "errors": 0}

    try:
        batch = []
        batch_size = 5000  # Larger batches for PostgreSQL

        for i, raw in enumerate(entries):
            try:
                norm = normalize_entry(raw, default_source)
                if not norm["chapter"] or not norm["main_rubric"] or not norm["remedy"]:
                    stats["errors"] += 1
                    continue

                norm["grade"] = max(1, min(4, norm["grade"]))
                norm["rubric_text"] = f"{norm['chapter']} > {norm['main_rubric']} > {norm['sub_condition']}".strip(" > ")

                batch.append(norm)

                if len(batch) >= batch_size:
                    _insert_batch(db, batch, stats)
                    batch = []
                    logger.info(f"  Progress: {i + 1}/{len(entries)} processed...")

            except Exception as e:
                stats["errors"] += 1

        if batch:
            _insert_batch(db, batch, stats)

        db.commit()
        logger.info(f"Done: {stats['inserted']} processed in bulk (conflicts ignored), {stats['errors']} errors")

    except Exception as e:
        db.rollback()
        logger.error(f"Fatal error during seeding: {e}")
        raise
    finally:
        db.close()

    return stats


def _insert_batch(db, batch: list, stats: dict):
    """Insert a batch using PostgreSQL ON CONFLICT DO NOTHING."""
    if not batch:
        return
    
    stmt = insert(Repertory).values(batch)
    stmt = stmt.on_conflict_do_nothing(
        index_elements=['chapter', 'main_rubric', 'sub_condition', 'remedy', 'source']
    )
    
    try:
        result = db.execute(stmt)
        stats["inserted"] += result.rowcount
    except Exception as e:
        logger.error(f"Batch insert failed: {e}")
        stats["errors"] += len(batch)


def clear_repertory():
    """Delete all entries from the repertory table."""
    db = SessionLocal()
    try:
        count = db.query(Repertory).count()
        db.query(Repertory).delete()
        db.commit()
        logger.info(f"Cleared {count} entries from repertory table")
    finally:
        db.close()


def report_stats():
    """Report current repertory statistics."""
    db = SessionLocal()
    try:
        total = db.query(func.count(Repertory.id)).scalar() or 0
        logger.info(f"Total repertory entries: {total}")

        if total > 0:
            sources = db.query(
                Repertory.source, func.count(Repertory.id)
            ).group_by(Repertory.source).all()
            for source, count in sources:
                logger.info(f"  {source}: {count} entries")

            chapters = db.query(
                Repertory.chapter, func.count(Repertory.id)
            ).group_by(Repertory.chapter).order_by(
                func.count(Repertory.id).desc()
            ).limit(10).all()
            logger.info("  Top chapters:")
            for chapter, count in chapters:
                logger.info(f"    {chapter}: {count} entries")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Seed repertory data from JSON files")
    parser.add_argument("--file", type=str, help="Path to a specific JSON file to load")
    parser.add_argument("--clear", action="store_true", help="Clear repertory table before loading")
    parser.add_argument("--dry-run", action="store_true", help="Preview entries without inserting")
    args = parser.parse_args()

    print()
    print("=" * 50)
    print("  Homeopathy Backend — Repertory Seeder")
    print("=" * 50)
    print()

    # We assume migrations have already been run to create tables
    
    if args.clear:
        clear_repertory()

    if args.file:
        file_path = Path(args.file)
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            sys.exit(1)
        seed_from_file(file_path, dry_run=args.dry_run)
    else:
        data_dir = backend_path / "data" / "normalized"
        if not data_dir.exists():
            data_dir.mkdir(parents=True, exist_ok=True)
            logger.warning(f"Created directory: {data_dir}")
            logger.warning("No JSON files found. Place your repertory JSON files here.")
            return

        json_files = sorted(data_dir.glob("*.json"))
        if not json_files:
            logger.warning(f"No JSON files found in {data_dir}")
            return

        logger.info(f"Found {len(json_files)} JSON file(s) in {data_dir}")
        for file_path in json_files:
            seed_from_file(file_path, dry_run=args.dry_run)
            print()

    if not args.dry_run:
        print()
        report_stats()

    print()
    print("✓ Repertory seeding complete!")
    print()


if __name__ == "__main__":
    main()
