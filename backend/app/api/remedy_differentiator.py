"""
Remedy Differentiator API Endpoints

Routes for detailed remedy analysis and comparison.
"""

from typing import Optional, List, Dict
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.db.database import get_db
from app.services.remedy_differentiator import RemedyDifferentiatorService
from app.services.repertorization import SelectedRubric

router = APIRouter()


class RubricInput(BaseModel):
    """Represents a selected rubric in the case"""
    chapter: str
    main_rubric: str
    sub_condition: Optional[str] = None
    category: str = "General"


class RemedyProfileRequest(BaseModel):
    """Request for individual remedy analysis"""
    remedy: str
    rubrics: List[RubricInput]
    weights: Optional[Dict[str, int]] = None


class ShortlistAnalysisRequest(BaseModel):
    """Request to analyze full shortlist"""
    remedies: List[str]
    rubrics: List[RubricInput]
    weights: Optional[Dict[str, int]] = None


class RemedyComparisonRequest(BaseModel):
    """Request to compare two remedies"""
    remedy1: str
    remedy2: str
    rubrics: List[RubricInput]
    weights: Optional[Dict[str, int]] = None


@router.post("/remedy/{remedy}/profile")
def get_remedy_profile(
    remedy: str,
    request: RemedyProfileRequest,
    db=Depends(get_db)
):
    """
    Get detailed profile of a single remedy.
    
    Shows:
    - Total coverage score across selected symptoms
    - Chapters where remedy is strongest/weakest
    - Grade distribution
    - Detailed list of all appearances
    
    Example:
        POST /api/remedy/Nux-v/profile
        {
            "remedy": "Nux-v",
            "rubrics": [
                {"chapter": "Mind", "main_rubric": "ANXIETY", "category": "Mental"},
                {"chapter": "Head", "main_rubric": "PAIN", "category": "Particular"}
            ],
            "weights": {"Mental": 5, "Particular": 2}
        }
    
    Returns:
        {
            "remedy": "Nux-v",
            "total_score": 35,
            "rubric_count": 2,
            "avg_grade": 3.5,
            "chapters_covered": ["Mind", "Head"],
            "strong_chapters": [
                {"chapter": "Head", "avg_grade": 4.0},
                {"chapter": "Mind", "avg_grade": 3.0}
            ],
            "weak_chapters": [],
            "all_appearances": [
                {
                    "chapter": "Mind",
                    "main_rubric": "ANXIETY",
                    "grade": 3,
                    "weight": 5,
                    "contribution": 15
                },
                ...
            ]
        }
    """
    # Convert to service format
    rubrics = [
        SelectedRubric(
            chapter=r.chapter,
            main_rubric=r.main_rubric,
            sub_condition=r.sub_condition,
            category=r.category
        )
        for r in request.rubrics
    ]
    
    # Get profile
    service = RemedyDifferentiatorService(db)
    profile = service.get_remedy_profile(
        remedy=remedy,
        rubrics=rubrics,
        weights=request.weights
    )
    
    return {
        "remedy": profile.remedy,
        "total_score": profile.total_score,
        "rubric_count": profile.rubric_count,
        "avg_grade": profile.avg_grade,
        "chapters_covered": profile.chapters_covered,
        "strong_chapters": [
            {"chapter": ch, "avg_grade": round(grade, 2)}
            for ch, grade in profile.strong_chapters
        ],
        "weak_chapters": [
            {"chapter": ch, "avg_grade": round(grade, 2)}
            for ch, grade in profile.weak_chapters
        ],
        "all_appearances": profile.all_appearances
    }


@router.post("/shortlist/analyze")
def analyze_shortlist(
    request: ShortlistAnalysisRequest,
    db=Depends(get_db)
):
    """
    Analyze entire shortlist and identify unique indications.
    
    Shows what each remedy specializes in - where it appears
    but other shortlist remedies don't.
    
    Example:
        POST /api/shortlist/analyze
        {
            "remedies": ["Nux-v", "Sulph", "Lach"],
            "rubrics": [
                {"chapter": "Mind", "main_rubric": "ANXIETY", "category": "Mental"},
                {"chapter": "Head", "main_rubric": "PAIN", "category": "Particular"},
                {"chapter": "Abdomen", "main_rubric": "DIARRHEA", "category": "General"}
            ],
            "weights": {"Mental": 5, "Particular": 2, "General": 3}
        }
    
    Returns:
        {
            "shortlist_size": 3,
            "remedies": [
                {
                    "rank": 1,
                    "remedy": "Nux-v",
                    "total_score": 45,
                    "rubric_count": 3,
                    "avg_grade": 3.0,
                    "chapters_covered": ["Mind", "Head", "Abdomen"],
                    "strong_chapters": [...],
                    "unique_indications_count": 1,
                    "unique_indications": [
                        {
                            "chapter": "Abdomen",
                            "main_rubric": "DIARRHEA",
                            "avg_grade": 3.5
                        }
                    ]
                },
                ...
            ]
        }
    """
    # Convert to service format
    rubrics = [
        SelectedRubric(
            chapter=r.chapter,
            main_rubric=r.main_rubric,
            sub_condition=r.sub_condition,
            category=r.category
        )
        for r in request.rubrics
    ]
    
    # Analyze
    service = RemedyDifferentiatorService(db)
    analysis = service.get_shortlist_analysis(
        remedies=request.remedies,
        rubrics=rubrics,
        weights=request.weights
    )
    
    return analysis


@router.post("/remedies/differentiate")
def differentiate_remedies(
    request: RemedyComparisonRequest,
    db=Depends(get_db)
):
    """
    Detailed head-to-head comparison of two remedies.
    
    Determines which is more suitable for the case and explains why.
    
    Example:
        POST /api/remedies/differentiate
        {
            "remedy1": "Nux-v",
            "remedy2": "Sulph",
            "rubrics": [
                {"chapter": "Mind", "main_rubric": "ANXIETY", "category": "Mental"},
                {"chapter": "Head", "main_rubric": "PAIN", "category": "Particular"},
                {"chapter": "Abdomen", "main_rubric": "DIARRHEA", "category": "General"}
            ],
            "weights": {"Mental": 5, "Particular": 2, "General": 3}
        }
    
    Returns:
        {
            "remedy1": "Nux-v",
            "remedy2": "Sulph",
            "winner": "Nux-v",
            "supporting_both": [
                {
                    "rubric": "Mind/ANXIETY",
                    "remedy1": "Nux-v",
                    "remedy2": "Sulph",
                    "remedy1_grade": 3,
                    "remedy2_grade": 2,
                    "winner": "Nux-v",
                    "strength_diff": 1
                }
            ],
            "supporting_1_only": [
                {
                    "rubric": "Abdomen/DIARRHEA",
                    "grade": 3
                }
            ],
            "supporting_2_only": [
                {
                    "rubric": "Head/PAIN",
                    "grade": 4
                }
            ],
            "strength_comparison": {
                "Nux-v_score": 40,
                "Sulph_score": 25,
                "difference": 15,
                "Nux-v_rubric_count": 3,
                "Sulph_rubric_count": 2,
                "Nux-v_avg_grade": 2.67,
                "Sulph_avg_grade": 2.5
            },
            "differentiation_summary": "Nux-v is the stronger choice..."
        }
    """
    # Convert to service format
    rubrics = [
        SelectedRubric(
            chapter=r.chapter,
            main_rubric=r.main_rubric,
            sub_condition=r.sub_condition,
            category=r.category
        )
        for r in request.rubrics
    ]
    
    # Compare
    service = RemedyDifferentiatorService(db)
    comparison = service.compare_pair(
        remedy1=request.remedy1,
        remedy2=request.remedy2,
        rubrics=rubrics,
        weights=request.weights
    )
    
    return {
        "remedy1": comparison.remedy1,
        "remedy2": comparison.remedy2,
        "winner": comparison.winner,
        "supporting_both": comparison.supporting_both,
        "supporting_1_only": comparison.supporting_1_only,
        "supporting_2_only": comparison.supporting_2_only,
        "strength_comparison": comparison.strength_comparison,
        "differentiation_summary": comparison.differentiation_summary
    }
