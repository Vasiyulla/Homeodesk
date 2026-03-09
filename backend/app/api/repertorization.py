"""
Repertorization API Endpoints

Routes for weighted remedy scoring and comparison.
"""

from typing import Optional, List, Dict
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.db.database import get_db
from app.services.repertorization import RepertorizationService, SelectedRubric

router = APIRouter()


class RubricInput(BaseModel):
    """Represents a selected rubric in the case"""
    chapter: str
    main_rubric: str
    sub_condition: Optional[str] = None
    category: str = "General"  # Mental, General, Particular, Causation, etc.
    source: str = "both"


class RepertorizeRequest(BaseModel):
    """Request to score remedies based on selected symptoms"""
    rubrics: List[RubricInput]
    weights: Optional[Dict[str, int]] = None  # {"Mental": 5, "General": 3, ...}
    source: str = "both"
    limit: int = 10


class CompareRemediesRequest(BaseModel):
    """Request to compare two remedies"""
    remedy1: str
    remedy2: str
    rubrics: List[RubricInput]
    weights: Optional[Dict[str, int]] = None


@router.post("/repertorize")
def repertorize(
    request: RepertorizeRequest,
    db=Depends(get_db)
):
    """
    Score remedies based on selected rubrics with category weights.
    
    Implements classic homeopathic repertorization:
    Score = Σ(remedy_grade × symptom_weight)
    
    Example:
        POST /api/repertorize
        {
            "rubrics": [
                {
                    "chapter": "Mind",
                    "main_rubric": "ANXIETY",
                    "sub_condition": "from stress",
                    "category": "Mental",
                    "source": "both"
                },
                {
                    "chapter": "Head",
                    "main_rubric": "PAIN",
                    "sub_condition": "throbbing",
                    "category": "Particular",
                    "source": "both"
                }
            ],
            "weights": {
                "Mental": 5,
                "Particular": 2
            },
            "source": "both",
            "limit": 10
        }
    
    Returns:
        {
            "case_id": "unique-case-id",
            "symptom_count": 2,
            "remedy_count": 10,
            "remedies": [
                {
                    "rank": 1,
                    "remedy": "Nux-v",
                    "total_score": 35,
                    "rubric_count": 2,
                    "avg_grade": 3.5,
                    "confidence": "HIGH",
                    "breakdown": [
                        {
                            "chapter": "Mind",
                            "main_rubric": "ANXIETY",
                            "grade": 3,
                            "weight": 5,
                            "contribution": 15
                        },
                        {
                            "chapter": "Head",
                            "main_rubric": "PAIN",
                            "grade": 4,
                            "weight": 2,
                            "contribution": 8
                        }
                    ]
                },
                ...
            ],
            "methodology": "Homeopathic Weighted Repertorization"
        }
    """
    # Convert request rubrics to service objects
    rubrics = [
        SelectedRubric(
            chapter=r.chapter,
            main_rubric=r.main_rubric,
            sub_condition=r.sub_condition,
            category=r.category,
            source=r.source
        )
        for r in request.rubrics
    ]
    
    # Score remedies
    service = RepertorizationService(db)
    scores = service.score_remedies(
        rubrics=rubrics,
        weights=request.weights,
        source=request.source,
        limit=request.limit
    )
    
    # Format response
    remedies = []
    for score in scores:
        remedies.append({
            "rank": score.rank,
            "remedy": score.remedy,
            "total_score": score.total_score,
            "remedy_occurrences": score.remedy_count,
            "confidence": score.confidence,
            "breakdown": [
                {
                    "chapter": b["chapter"],
                    "main_rubric": b["main_rubric"],
                    "sub_condition": b["sub_condition"],
                    "category": b["category"],
                    "grade": b["grade"],
                    "weight": b["weight"],
                    "contribution": b["contribution"],
                    "source": b["source"]
                }
                for b in score.breakdown
            ]
        })
    
    return {
        "symptom_count": len(rubrics),
        "remedy_count": len(remedies),
        "remedies": remedies,
        "methodology": "Homeopathic Weighted Repertorization (Score = Σ(grade × weight))"
    }


@router.post("/remedies/compare")
def compare_remedies(
    request: CompareRemediesRequest,
    db=Depends(get_db)
):
    """
    Compare two remedies side-by-side across selected rubrics.
    
    Shows:
    - Where both remedies appear (and which is stronger)
    - Where only remedy1 appears
    - Where only remedy2 appears
    - Total scores and coverage
    
    Example:
        POST /api/remedies/compare
        {
            "remedy1": "Nux-v",
            "remedy2": "Sulph",
            "rubrics": [
                {
                    "chapter": "Mind",
                    "main_rubric": "ANXIETY",
                    "category": "Mental"
                },
                ...
            ],
            "weights": {"Mental": 5, "Particular": 2}
        }
    
    Returns:
        {
            "remedy1": {
                "name": "Nux-v",
                "total_score": 35,
                "rubric_count": 2,
                "avg_grade": 3.5
            },
            "remedy2": {
                "name": "Sulph",
                "total_score": 20,
                "rubric_count": 2,
                "avg_grade": 2.5
            },
            "supporting_both": [
                {
                    "rubric": "Mind/ANXIETY",
                    "remedy1_grade": 3,
                    "remedy2_grade": 2,
                    "winner": "Nux-v"
                }
            ],
            "supporting_1_only": [...],
            "supporting_2_only": [...]
        }
    """
    # Convert request rubrics
    rubrics = [
        SelectedRubric(
            chapter=r.chapter,
            main_rubric=r.main_rubric,
            sub_condition=r.sub_condition,
            category=r.category,
            source=r.source
        )
        for r in request.rubrics
    ]
    
    # Get comparison
    service = RepertorizationService(db)
    comparison = service.get_remedy_comparison(
        remedy1=request.remedy1,
        remedy2=request.remedy2,
        rubrics=rubrics,
        weights=request.weights
    )
    
    return comparison
