"""
Repertory search and verification endpoints.
"""
from fastapi import APIRouter, Query, Depends
from app.db.database import SessionLocal, get_db
from app.db.models import Repertory
from app.services.repertory_search import RepertorySearchService
from app.services.repertorization import RepertorizationService, SelectedRubric, RemedyScore
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict
from sqlalchemy import func
from app.core.security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


class RemedyInfo(BaseModel):
    remedy: str
    grade: int
    source: str


class RubricEntry(BaseModel):
    chapter: str
    main_rubric: str
    sub_condition: str
    remedies: List[RemedyInfo]


class SearchResult(BaseModel):
    count: int
    results: List[Dict]


@router.get("/stats")
def get_repertory_stats(db: Session = Depends(get_db)):
    """Get overall statistics about the loaded repertory."""
    service = RepertorySearchService(db)
    return service.get_stats()


@router.get("/chapters")
def list_chapters(source: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """List all chapters in the repertory."""
    service = RepertorySearchService(db)
    chapters = service.get_chapters(source)
    return {
        "source": source or "all",
        "count": len(chapters),
        "chapters": chapters
    }


@router.get("/chapters/{chapter}/rubrics")
def get_chapter_rubrics(
    chapter: str,
    source: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all rubrics in a chapter."""
    service = RepertorySearchService(db)
    rubrics = service.get_rubrics_for_chapter(chapter, source)
    return {
        "chapter": chapter,
        "source": source or "all",
        "count": len(rubrics),
        "rubrics": rubrics
    }


@router.get("/search/remedy")
def search_remedy(
    name: str = Query(..., description="Remedy name to search for"),
    source: Optional[str] = Query(None, description="Filter by source (kent/boger)"),
    db: Session = Depends(get_db)
):
    """Search for a remedy across all rubrics."""
    service = RepertorySearchService(db)
    results = service.search_by_remedy(name, source)
    
    return {
        "query": name,
        "source": source or "all",
        "count": len(results),
        "results": [
            {
                "chapter": r.chapter,
                "main_rubric": r.main_rubric,
                "sub_condition": r.sub_condition,
                "remedy": r.remedy,
                "grade": r.grade,
                "source": r.source
            }
            for r in results[:100]  # Limit to 100
        ]
    }


@router.get("/search/rubric")
def search_rubric(
    text: str = Query(..., description="Rubric text to search for"),
    source: Optional[str] = Query(None, description="Filter by source (kent/boger)"),
    db: Session = Depends(get_db)
):
    """Search for rubrics by text."""
    service = RepertorySearchService(db)
    results = service.search_by_rubric(text, source)
    
    return {
        "query": text,
        "source": source or "all",
        "count": len(results),
        "results": [
            {
                "chapter": r.chapter,
                "main_rubric": r.main_rubric,
                "sub_condition": r.sub_condition,
                "remedy": r.remedy,
                "grade": r.grade,
                "source": r.source
            }
            for r in results[:100]  # Limit to 100
        ]
    }


@router.get("/search/chapter")
def search_chapter(
    name: str = Query(..., description="Chapter name to search for"),
    source: Optional[str] = Query(None, description="Filter by source (kent/boger)"),
    db: Session = Depends(get_db)
):
    """Search for chapters by name."""
    service = RepertorySearchService(db)
    results = service.search_by_chapter(name, source)
    
    return {
        "query": name,
        "source": source or "all",
        "count": len(results),
        "results": [
            {
                "chapter": r.chapter,
                "main_rubric": r.main_rubric,
                "sub_condition": r.sub_condition,
                "remedy": r.remedy,
                "grade": r.grade,
                "source": r.source
            }
            for r in results[:100]  # Limit to 100
        ]
    }


@router.get("/remedy/{remedy_name}/info")
def get_remedy_info(
    remedy_name: str,
    source: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get comprehensive information about a remedy."""
    service = RepertorySearchService(db)
    info = service.get_remedy_occurrence(remedy_name, source)
    return info


@router.get("/rubric/{chapter}/{main_rubric}")
def get_rubric_remedies(
    chapter: str,
    main_rubric: str,
    sub_condition: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all remedies for a specific rubric."""
    service = RepertorySearchService(db)
    remedies = service.get_remedies_for_rubric(chapter, main_rubric, sub_condition, source)
    
    return {
        "chapter": chapter,
        "main_rubric": main_rubric,
        "sub_condition": sub_condition,
        "source": source or "all",
        "remedy_count": len(remedies),
        "remedies": remedies
    }


@router.get("/search/fuzzy")
def fuzzy_search(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, description="Max results to return"),
    source: Optional[str] = Query(None, description="Filter by source"),
    db: Session = Depends(get_db)
):
    """Fuzzy search for rubrics with similarity scoring."""
    service = RepertorySearchService(db)
    results = service.fuzzy_search_rubric(q, limit, source)
    
    return {
        "query": q,
        "source": source or "all",
        "count": len(results),
        "results": [
            {
                "similarity": score,
                "entry": {
                    "chapter": r.chapter,
                    "main_rubric": r.main_rubric,
                    "sub_condition": r.sub_condition,
                    "remedy": r.remedy,
                    "grade": r.grade,
                    "source": r.source
                }
            }
            for r, score in results
        ]
    }


@router.get("/verify")
def verify_data(db: Session = Depends(get_db)):
    """Verify that data has been loaded correctly."""
    total = db.query(func.count(Repertory.id)).scalar()
    
    if total == 0:
        return {
            "status": "error",
            "message": "No repertory data loaded",
            "total_entries": 0
        }
    
    # Get basic stats
    kent_count = db.query(func.count(Repertory.id)).filter(
        Repertory.source == "kent"
    ).scalar() or 0
    
    boger_count = db.query(func.count(Repertory.id)).filter(
        Repertory.source == "boger"
    ).scalar() or 0
    
    chapters = db.query(func.count(Repertory.chapter.distinct())).scalar()
    
    # Sample entries
    samples = db.query(Repertory).limit(5).all()
    
    return {
        "status": "success",
        "message": "Repertory data loaded successfully",
        "total_entries": total,
        "by_source": {
            "kent": kent_count,
            "boger": boger_count
        },
        "unique_chapters": chapters,
        "sample_entries": [
            {
                "chapter": s.chapter,
                "main_rubric": s.main_rubric,
                "remedy": s.remedy,
                "grade": s.grade,
                "source": s.source
            }
            for s in samples
        ]
    }


class RepertorizeRequest(BaseModel):
    rubrics: List[SelectedRubric]
    weights: Optional[Dict[str, float]] = None

@router.post("/repertorize", response_model=List[RemedyScore])
def repertorize(
    request: RepertorizeRequest,
    db: Session = Depends(get_db)
):
    """Calculate remedy scores based on a list of selected rubrics."""
    service = RepertorizationService(db)
    results = service.repertorize(request.rubrics, request.weights)
    return results
