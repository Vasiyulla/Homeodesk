from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Repertory

class SelectedRubric(BaseModel):
    chapter: str
    main_rubric: str
    sub_condition: Optional[str] = None
    category: Optional[str] = "General"
    source: Optional[str] = None

class RemedyScore(BaseModel):
    remedy: str
    total_score: float
    rubric_count: int
    rubrics_covered: List[Dict[str, int]]  # list of { "rubric_id_or_name": grade }

class RepertorizationService:
    def __init__(self, db: Session):
        self.db = db

    def repertorize(
        self,
        rubrics: List[SelectedRubric],
        weights: Optional[Dict[str, float]] = None
    ) -> List[RemedyScore]:
        if not weights:
            weights = {
                "Mental": 1.0,
                "General": 1.0,
                "Particular": 1.0,
                "Causation": 1.0
            }
        
        # remedy_name -> { "total_score": float, "rubrics_covered": { rubric_identifier: grade } }
        remedy_stats = {}
        
        for idx, rubric in enumerate(rubrics):
            query = self.db.query(Repertory.remedy, Repertory.grade).filter(
                Repertory.chapter == rubric.chapter,
                Repertory.main_rubric == rubric.main_rubric
            )
            
            if rubric.sub_condition:
                query = query.filter(Repertory.sub_condition == rubric.sub_condition)
                
            if rubric.source:
                query = query.filter(Repertory.source == rubric.source)
                
            entries = query.all()
            weight = weights.get(rubric.category, 1.0)
            
            rubric_id = f"{rubric.chapter} | {rubric.main_rubric}" + (f" | {rubric.sub_condition}" if rubric.sub_condition else "")
            
            for entry in entries:
                rem = entry.remedy
                grade = entry.grade
                
                if rem not in remedy_stats:
                    remedy_stats[rem] = {
                        "total_score": 0.0,
                        "rubrics_covered": {}
                    }
                    
                remedy_stats[rem]["total_score"] += grade * weight
                remedy_stats[rem]["rubrics_covered"][rubric_id] = grade

        # Convert to list and sort
        results = []
        for rem, stats in remedy_stats.items():
            results.append(
                RemedyScore(
                    remedy=rem,
                    total_score=stats["total_score"],
                    rubric_count=len(stats["rubrics_covered"]),
                    rubrics_covered=[{k: v} for k, v in stats["rubrics_covered"].items()]
                )
            )
            
        # Sort by total score DESC, then rubric count DESC
        results.sort(key=lambda x: (x.total_score, x.rubric_count), reverse=True)
        return results
