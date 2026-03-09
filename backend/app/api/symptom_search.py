"""
Symptom Search API Endpoints

Routes for searching symptoms and mapping them to repertory rubrics.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query

from app.db.database import get_db
from app.services.symptom_search import SymptomSearchService
from pydantic import BaseModel

router = APIRouter()


class SymptomSearchRequest(BaseModel):
    """Request model for symptom search"""
    symptom: str
    source: str = "both"
    limit: int = 10
    min_confidence: str = "LOW"


class SymptomByCategoryRequest(BaseModel):
    """Request model for category-based symptom search"""
    mental_symptoms: Optional[List[str]] = None
    general_symptoms: Optional[List[str]] = None
    particular_symptoms: Optional[List[str]] = None
    causation_symptoms: Optional[List[str]] = None
    source: str = "both"


@router.post("/symptom-search")
def search_symptom(
    request: SymptomSearchRequest,
    db=Depends(get_db)
):
    """
    Search for a symptom and get matching repertory rubrics.
    
    Takes free-text symptom input and returns matching rubrics with:
    - Similarity score (how well symptom matches rubric)
    - Remedy count (how many remedies are in this rubric)
    - Confidence level (HIGH/MEDIUM/LOW)
    - Source (Kent/Boger)
    
    Example:
        POST /api/symptom-search
        {
            "symptom": "throbbing headache from stress",
            "source": "both",
            "limit": 10,
            "min_confidence": "LOW"
        }
    
    Returns:
        {
            "symptom": "throbbing headache from stress",
            "count": 8,
            "results": [
                {
                    "chapter": "Head",
                    "main_rubric": "PAIN",
                    "sub_condition": "throbbing",
                    "similarity_score": 0.92,
                    "remedy_count": 18,
                    "confidence": "HIGH",
                    "source": "kent"
                },
                ...
            ]
        }
    """
    service = SymptomSearchService(db)
    return service.search_symptom(
        symptom_text=request.symptom,
        limit=request.limit,
        source=request.source,
        min_confidence=request.min_confidence
    )


@router.get("/symptom-search")
def search_symptom_get(
    symptom: str = Query(..., description="Free-text symptom"),
    source: str = Query("both", description="Kent, Boger, or both"),
    limit: int = Query(10, description="Max rubrics to return"),
    db=Depends(get_db)
):
    """
    GET version of symptom search (for simple URL-based queries).
    
    Example:
        GET /api/symptom-search?symptom=headache&source=both&limit=10
    """
    service = SymptomSearchService(db)
    return service.search_symptom(
        symptom_text=symptom,
        limit=limit,
        source=source
    )


@router.post("/symptom-search/by-category")
def search_by_category(
    request: SymptomByCategoryRequest,
    db=Depends(get_db)
):
    """
    Search symptoms organized by homeopathic categories.
    
    This endpoint is useful for structured case-taking where symptoms
    are already organized by Mental/General/Particular/Causation.
    
    Example:
        POST /api/symptom-search/by-category
        {
            "mental_symptoms": ["anxiety", "irritability"],
            "general_symptoms": ["fever"],
            "particular_symptoms": ["throbbing head"],
            "causation_symptoms": ["worse from stress"],
            "source": "both"
        }
    
    Returns:
        {
            "Mental": [
                {
                    "chapter": "Mind",
                    "main_rubric": "ANXIETY",
                    ...
                },
                ...
            ],
            "General": [...],
            "Particular": [...],
            "Causation": [...]
        }
    """
    service = SymptomSearchService(db)
    return service.search_symptom_by_category(
        mental_symptoms=request.mental_symptoms,
        general_symptoms=request.general_symptoms,
        particular_symptoms=request.particular_symptoms,
        causation_symptoms=request.causation_symptoms,
        source=request.source
    )


@router.get("/symptom-search/top/{symptom}")
def get_top_rubrics(
    symptom: str,
    count: int = Query(3, description="Number of top rubrics"),
    source: str = Query("both", description="Kent, Boger, or both"),
    db=Depends(get_db)
):
    """
    Get only the top N rubrics for a symptom.
    
    Useful for quick recommendations and shortlisting.
    
    Example:
        GET /api/symptom-search/top/headache?count=3&source=both
    
    Returns:
        {
            "symptom": "headache",
            "count": 3,
            "results": [
                {
                    "chapter": "Head",
                    "main_rubric": "PAIN",
                    "sub_condition": "throbbing",
                    "similarity_score": 0.92,
                    "remedy_count": 18,
                    "confidence": "HIGH",
                    "source": "kent"
                },
                ...
            ]
        }
    """
    service = SymptomSearchService(db)
    results = service.get_top_rubrics_for_symptom(symptom, count, source)
    return {
        "symptom": symptom,
        "count": len(results),
        "results": results
    }
