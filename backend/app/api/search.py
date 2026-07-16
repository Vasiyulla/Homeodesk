from fastapi import APIRouter, Query, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict

from app.core.security import get_current_user
from app.services.repertory_loader import get_loader

router = APIRouter(dependencies=[Depends(get_current_user)])

class RemedyEntry(BaseModel):
    name: str
    grade: int

class RubricEntry(BaseModel):
    id: str
    source: str
    section: str
    rubric: str
    remedies: List[RemedyEntry]

class SearchResponse(BaseModel):
    query: str
    count: int
    results: List[dict]

@router.get("/sections")
def list_sections() -> dict:
    loader = get_loader()
    return {"sections": loader.get_sections()}

@router.get("/chapter/{chapter}")
def get_rubrics_for_chapter(chapter: str, source: Optional[str] = Query(None)) -> dict:
    loader = get_loader()
    results = loader.get_rubrics_by_chapter(chapter, source or "both")
    return {"chapter": chapter, "count": len(results), "rubrics": results}

@router.get("/rubric/exact")
def get_exact_rubric(
    chapter: str = Query(...), 
    main_rubric: str = Query(...), 
    sub_condition: Optional[str] = Query(""), 
    source: Optional[str] = Query(None)
) -> dict:
    loader = get_loader()
    results = loader.get_rubric_exact(chapter, main_rubric, sub_condition or "", source or "both")
    return {"count": len(results), "results": results}

@router.get("/search")
def search_rubrics(q: str = Query(...), source: Optional[str] = Query(None)) -> SearchResponse:
    loader = get_loader()
    results = loader.search_symptoms(q, source or "both", limit=100)
    
    return SearchResponse(
        query=q,
        count=len(results),
        results=results
    )

@router.get("/stats")
def get_stats() -> dict:
    loader = get_loader()
    stats = {}
    if loader.combined_df is not None:
        df = loader.combined_df
        sources = df['Source'].unique()
        for src in sources:
            src_df = df[df['Source'] == src]
            stats[src] = {
                "total_remedy_entries": int(src_df['Remedy_Count'].sum()),
                "sections": int(src_df['Chapter'].nunique())
            }
    return stats

@router.get("/remedies")
def list_remedies() -> dict:
    loader = get_loader()
    remedies = loader.get_all_remedies()
    return {"count": len(remedies), "remedies": remedies}

@router.get("/remedy/{remedy_name}")
def get_remedy_rubrics(remedy_name: str, source: Optional[str] = Query(None)) -> dict:
    loader = get_loader()
    results = loader.get_rubrics_by_remedy(remedy_name, source or "both")
    return {"remedy": remedy_name, "count": len(results), "rubrics": results}
