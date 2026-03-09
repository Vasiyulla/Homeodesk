from fastapi import APIRouter, Query
from app.services.repertory_loader import get_loader
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class RubricEntry(BaseModel):
    id: str
    source: str
    section: str
    rubric: str
    remedies: List[dict]
    line: int


class SearchResponse(BaseModel):
    query: str
    count: int
    results: List[RubricEntry]


@router.get("/sections")
def list_sections() -> dict:
    """List all available sections across repertories."""
    loader = get_loader()
    sections = set()
    for entry in loader.get_all():
        if entry.get('section'):
            sections.add(entry['section'])
    return {"sections": sorted(list(sections))}


@router.get("/by-section/{section}")
def get_by_section(section: str, source: Optional[str] = Query(None)) -> dict:
    """Get all rubrics in a section (optionally filtered by source)."""
    loader = get_loader()
    results = loader.search_by_section(section, source)
    return {
        "section": section,
        "source": source or "all",
        "count": len(results),
        "results": results
    }


@router.get("/search")
def search_rubrics(q: str = Query(...), source: Optional[str] = Query(None)) -> SearchResponse:
    """Search rubrics by text (case-insensitive substring match)."""
    loader = get_loader()
    results = loader.search_by_rubric_text(q, source)
    return SearchResponse(
        query=q,
        count=len(results),
        results=[RubricEntry(**r) for r in results[:100]]  # Limit to 100 results
    )


@router.get("/entry/{entry_id}")
def get_entry(entry_id: str) -> dict:
    """Get a single entry by ID."""
    loader = get_loader()
    entry = loader.get_by_id(entry_id)
    if not entry:
        return {"error": f"Entry {entry_id} not found"}
    return entry


@router.get("/stats")
def get_stats() -> dict:
    """Get statistics about loaded repertories."""
    loader = get_loader()
    stats = {}
    for source, entries in loader.data.items():
        sections = set(e.get('section', 'Unknown') for e in entries)
        stats[source] = {
            "total_entries": len(entries),
            "sections": len(sections),
            "section_names": sorted(list(sections))
        }
    return stats
