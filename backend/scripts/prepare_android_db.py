"""
Prepare Android Database — Import CSV repertory data into SQLite with FTS5 indexes.

This script:
1. Copies the existing homeopathy.db (users, cases, etc.)
2. Creates repertory_entries table from the Boger & Kent CSVs
3. Creates FTS5 full-text search index for fast mobile symptom search
4. Output: homeopathy_android.db ready for APK bundling

Usage:
    python scripts/prepare_android_db.py
"""

import csv
import json
import re
import shutil
import sqlite3
import sys
from pathlib import Path

# Paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data" / "repertories"
SOURCE_DB = BACKEND_DIR / "homeopathy.db"
OUTPUT_DB = BACKEND_DIR / "homeopathy_android.db"

BOGER_CSV = DATA_DIR / "error_free_boger.csv"
KENT_CSV = DATA_DIR / "error_free_kent.csv"

REMEDY_PATTERN = re.compile(r'([a-zA-Z0-9\-]+)\.\((\d+)\)')


def parse_remedies(remedy_str: str) -> list:
    """Parse remedy string like 'Acon.(2) Bell.(3)' into JSON-compatible list."""
    if not remedy_str:
        return []
    matches = REMEDY_PATTERN.findall(remedy_str)
    return [{"name": f"{name}.", "grade": int(grade)} for name, grade in matches]


def create_repertory_tables(conn: sqlite3.Connection):
    """Create the repertory_entries table and FTS5 virtual table."""
    cur = conn.cursor()

    # Drop existing tables if re-running
    cur.execute("DROP TABLE IF EXISTS repertory_entries_fts")
    cur.execute("DROP TABLE IF EXISTS repertory_entries")

    # Main repertory table
    cur.execute("""
        CREATE TABLE repertory_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            chapter TEXT NOT NULL,
            main_rubric TEXT NOT NULL,
            sub_condition TEXT NOT NULL DEFAULT '',
            remedy_json TEXT NOT NULL DEFAULT '[]',
            remedy_count INTEGER NOT NULL DEFAULT 0,
            search_text TEXT NOT NULL DEFAULT ''
        )
    """)

    # FTS5 virtual table for fast full-text search
    cur.execute("""
        CREATE VIRTUAL TABLE repertory_entries_fts USING fts5(
            search_text,
            content='repertory_entries',
            content_rowid='id',
            tokenize='unicode61'
        )
    """)

    # Index for chapter lookups
    cur.execute("CREATE INDEX idx_repertory_chapter ON repertory_entries(chapter)")
    cur.execute("CREATE INDEX idx_repertory_source ON repertory_entries(source)")

    conn.commit()
    print("[OK] Created repertory_entries table and FTS5 index")


def import_csv(conn: sqlite3.Connection, csv_path: Path, source_name: str):
    """Import a single CSV file into the repertory_entries table."""
    if not csv_path.exists():
        print(f"[WARN] CSV not found: {csv_path}")
        return 0

    cur = conn.cursor()
    count = 0

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        batch = []

        for row in reader:
            chapter = row.get('Chapter', '').strip()
            main_rubric = row.get('Main_Rubric', '').strip()
            sub_condition = row.get('Sub_Condition', '').strip()
            remedy_str = row.get('Remedy', '')

            remedies = parse_remedies(remedy_str)
            remedy_json = json.dumps(remedies)
            remedy_count = len(remedies)

            # Build search text: "Chapter - Main_Rubric - Sub_Condition"
            search_text = f"{chapter} - {main_rubric}"
            if sub_condition and sub_condition != main_rubric:
                search_text += f" - {sub_condition}"

            batch.append((
                source_name,
                chapter,
                main_rubric,
                sub_condition,
                remedy_json,
                remedy_count,
                search_text,
            ))
            count += 1

            # Insert in batches of 1000
            if len(batch) >= 1000:
                cur.executemany("""
                    INSERT INTO repertory_entries
                    (source, chapter, main_rubric, sub_condition, remedy_json, remedy_count, search_text)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, batch)
                batch = []

        # Insert remaining
        if batch:
            cur.executemany("""
                INSERT INTO repertory_entries
                (source, chapter, main_rubric, sub_condition, remedy_json, remedy_count, search_text)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, batch)

    conn.commit()
    print(f"[OK] Imported {count} entries from {source_name}")
    return count


def populate_fts(conn: sqlite3.Connection):
    """Populate the FTS5 index from the main table."""
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO repertory_entries_fts(rowid, search_text)
        SELECT id, search_text FROM repertory_entries
    """)
    conn.commit()
    print("[OK] FTS5 index populated")


def create_all_remedies_view(conn: sqlite3.Connection):
    """Create a helper table with all unique remedy names for autocomplete."""
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS unique_remedies")
    cur.execute("""
        CREATE TABLE unique_remedies (
            name TEXT PRIMARY KEY
        )
    """)

    # Extract unique remedy names from JSON
    cur.execute("SELECT remedy_json FROM repertory_entries WHERE remedy_count > 0")
    all_remedies = set()
    for (rj,) in cur.fetchall():
        remedies = json.loads(rj)
        for r in remedies:
            all_remedies.add(r['name'])

    cur.executemany(
        "INSERT OR IGNORE INTO unique_remedies (name) VALUES (?)",
        [(name,) for name in sorted(all_remedies)]
    )
    conn.commit()
    print(f"[OK] Created unique_remedies table with {len(all_remedies)} remedies")


def clean_application_data(conn: sqlite3.Connection):
    """Clear all application operational data (patients, cases, orgs, users) for a clean install."""
    cur = conn.cursor()
    tables = [
        "patients", "patient_vitals", "appointments", "cases", "decisions", 
        "dose_logs", "follow_ups", "invoices", "invoice_items", "audit_logs", 
        "users", "organizations", "organization_users", "employee_profiles", 
        "departments"
    ]
    for table in tables:
        try:
            cur.execute(f"DELETE FROM {table}")
        except sqlite3.OperationalError:
            # Table might not exist yet if starting from empty DB, which is fine
            pass
    conn.commit()
    print("[OK] Cleared development application data (fresh install database)")


def main():
    print("=" * 60)
    print("  Preparing Android Database")
    print("=" * 60)

    # Step 1: Copy existing DB
    if SOURCE_DB.exists():
        shutil.copy2(SOURCE_DB, OUTPUT_DB)
        print(f"[OK] Copied {SOURCE_DB.name} -> {OUTPUT_DB.name}")
    else:
        print(f"[INFO] No existing DB found, creating fresh: {OUTPUT_DB.name}")
        # Create empty DB — tables will be created by SQLAlchemy metadata
        conn = sqlite3.connect(str(OUTPUT_DB))
        conn.close()

    # Step 2: Open and add repertory tables
    conn = sqlite3.connect(str(OUTPUT_DB))
    conn.execute("PRAGMA journal_mode=WAL")

    clean_application_data(conn)

    create_repertory_tables(conn)

    # Step 3: Import CSVs
    total = 0
    total += import_csv(conn, BOGER_CSV, "Boger")
    total += import_csv(conn, KENT_CSV, "Kent")

    # Step 4: Populate FTS index
    populate_fts(conn)

    # Step 5: Create unique remedies lookup
    create_all_remedies_view(conn)

    # Step 6: Optimize
    conn.execute("ANALYZE")
    conn.execute("VACUUM")
    conn.commit()

    # Report
    file_size_mb = OUTPUT_DB.stat().st_size / (1024 * 1024)
    print(f"\n{'=' * 60}")
    print(f"  Done! {total} repertory entries imported")
    print(f"  Output: {OUTPUT_DB}")
    print(f"  Size: {file_size_mb:.1f} MB")
    print(f"{'=' * 60}")

    conn.close()


if __name__ == "__main__":
    main()
