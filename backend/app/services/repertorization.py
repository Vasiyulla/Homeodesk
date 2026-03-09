"""
Repertorization Service - Weighted remedy scoring engine.

This service implements the classic homeopathic repertorization algorithm:
Score = Σ(remedy_grade × symptom_weight) for each remedy across selected rubrics

Each rubric represents a selected symptom, and remedies are scored based on:
1. The grade of the remedy in that rubric (1-4 scale)
2. The weight assigned to that symptom category (Mental, General, Particular, Causation)

The final score is the sum of all (grade × weight) contributions.
"""

from typing import List, Dict, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from dataclasses import dataclass

from app.db.models import Repertory


@dataclass
class SelectedRubric:
    """Represents a rubric selected by the practitioner"""
    chapter: str
    main_rubric: str
    sub_condition: Optional[str] = None
    category: str = "General"  # Mental, General, Particular, Causation, etc.
    source: str = "both"  # kendall, boger, or both


@dataclass
class RemedyScore:
    """Final score for a remedy"""
    rank: int
    remedy: str
    total_score: float
    breakdown: List[Dict]  # [{rubric, grade, weight, contribution}, ...]
    remedy_count: int  # Total appearances in database
    confidence: str  # HIGH/MEDIUM/LOW based on covering


class RepertorizationService:
    """
    Weighted repertorization engine.
    
    Implements the homeopathic repertorization algorithm:
    For each remedy, calculate: Score = Σ(grade × weight)
    where:
    - grade = remedy's grade in that rubric (1-4)
    - weight = category weight for that symptom
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # Default category weights (can be customized)
        self.default_weights = {
            "Mental": 5,
            "General": 3,
            "Particular": 2,
            "Causation": 1,
            "Modality": 1
        }
    
    def score_remedies(
        self,
        rubrics: List[SelectedRubric],
        weights: Optional[Dict[str, int]] = None,
        source: str = "both",
        limit: int = 10
    ) -> List[RemedyScore]:
        """
        Score all remedies based on selected rubrics and weights.
        
        Algorithm:
        1. For each remedy, find all matching entries in selected rubrics
        2. Sum up: grade × weight for each rubric
        3. Rank remedies by total score
        4. Calculate confidence based on remedy coverage
        
        Args:
            rubrics: List of SelectedRubric objects representing case symptoms
            weights: Category weights (e.g., {"Mental": 5, "General": 3})
                     If None, uses default weights
            source: "both", "kent", or "boger"
            limit: Number of top remedies to return
        
        Returns:
            List of RemedyScore objects, ranked by score
            
        Example:
            rubrics = [
                SelectedRubric(
                    chapter="Mind",
                    main_rubric="ANXIETY",
                    sub_condition="from stress",
                    category="Mental"
                ),
                SelectedRubric(
                    chapter="Head",
                    main_rubric="PAIN",
                    sub_condition="throbbing",
                    category="Particular"
                )
            ]
            
            weights = {"Mental": 5, "Particular": 2}
            
            scores = service.score_remedies(rubrics, weights)
            # Returns top 10 remedies ranked by score
        """
        # Use provided weights or defaults
        if weights is None:
            weights = self.default_weights
        
        # Dictionary to accumulate scores: remedy -> {score, breakdowns}
        remedy_scores = {}
        
        # For each selected rubric, find all matching remedies
        for rubric in rubrics:
            # Get the category weight
            category = rubric.category
            weight = weights.get(category, 1)  # Default weight = 1
            
            # Query remedies in this rubric
            query = self.db.query(Repertory).filter(
                Repertory.chapter == rubric.chapter,
                Repertory.main_rubric == rubric.main_rubric
            )
            
            # Filter by optional sub_condition
            if rubric.sub_condition:
                query = query.filter(Repertory.sub_condition == rubric.sub_condition)
            
            # Filter by source
            if source != "both" and rubric.source != "both":
                query = query.filter(Repertory.source == rubric.source)
            elif rubric.source != "both":
                query = query.filter(Repertory.source == rubric.source)
            elif source != "both":
                query = query.filter(Repertory.source == source)
            
            entries = query.all()
            
            # Score each remedy in this rubric
            for entry in entries:
                remedy = entry.remedy
                grade = entry.grade
                contribution = grade * weight
                
                # Initialize remedy score if not already
                if remedy not in remedy_scores:
                    remedy_scores[remedy] = {
                        "total": 0,
                        "breakdown": [],
                        "grades": []  # For statistics
                    }
                
                # Add to score
                remedy_scores[remedy]["total"] += contribution
                
                # Record breakdown (for explanation)
                remedy_scores[remedy]["breakdown"].append({
                    "chapter": rubric.chapter,
                    "main_rubric": rubric.main_rubric,
                    "sub_condition": rubric.sub_condition or "",
                    "category": category,
                    "grade": grade,
                    "weight": weight,
                    "contribution": contribution,
                    "source": entry.source
                })
                
                # Track grades for statistics
                remedy_scores[remedy]["grades"].append(grade)
        
        # Calculate confidence and create final scores
        results = []
        
        for rank, (remedy, data) in enumerate(
            sorted(remedy_scores.items(), key=lambda x: x[1]["total"], reverse=True),
            1
        ):
            if rank > limit:
                break
            
            # Count total remedy occurrences in database
            remedy_count = self.db.query(func.count(Repertory.id)).filter(
                Repertory.remedy == remedy
            ).scalar()
            
            # Calculate confidence
            # HIGH:   Appears in 3+ different rubrics AND has high average grade
            # MEDIUM: Appears in 2+ rubrics OR high average grade
            # LOW:    Appears in single rubric
            
            rubric_count = len(set(
                (b["chapter"], b["main_rubric"], b["sub_condition"])
                for b in data["breakdown"]
            ))
            avg_grade = sum(data["grades"]) / len(data["grades"])
            
            if rubric_count >= 3 and avg_grade >= 2.5:
                confidence = "HIGH"
            elif rubric_count >= 2 or avg_grade >= 3:
                confidence = "MEDIUM"
            else:
                confidence = "LOW"
            
            results.append(RemedyScore(
                rank=rank,
                remedy=remedy,
                total_score=data["total"],
                breakdown=data["breakdown"],
                remedy_count=remedy_count,
                confidence=confidence
            ))
        
        return results
    
    def get_remedy_comparison(
        self,
        remedy1: str,
        remedy2: str,
        rubrics: List[SelectedRubric],
        weights: Optional[Dict[str, int]] = None
    ) -> Dict:
        """
        Compare two remedies across the selected rubrics.
        
        Shows where each remedy appears in the symptom picture,
        supporting and contradicting rubrics.
        
        Returns:
            {
                "remedy1": {...},
                "remedy2": {...},
                "supporting_both": [...],  # Rubrics where both appear
                "supporting_1_only": [...],  # Rubrics where only remedy1 appears
                "supporting_2_only": [...],  # Rubrics where only remedy2 appears
                "comparison_summary": "Remedy1 is stronger in X rubrics..."
            }
        """
        if weights is None:
            weights = self.default_weights
        
        remedy1_data = {
            "appears_in": [],
            "total_score": 0,
            "avg_grade": 0
        }
        
        remedy2_data = {
            "appears_in": [],
            "total_score": 0,
            "avg_grade": 0
        }
        
        supporting_both = []
        supporting_1_only = []
        supporting_2_only = []
        
        # Check each rubric
        for rubric in rubrics:
            weight = weights.get(rubric.category, 1)
            
            query = self.db.query(Repertory).filter(
                Repertory.chapter == rubric.chapter,
                Repertory.main_rubric == rubric.main_rubric
            )
            
            if rubric.sub_condition:
                query = query.filter(Repertory.sub_condition == rubric.sub_condition)
            
            entries = query.all()
            
            remedy1_in_rubric = None
            remedy2_in_rubric = None
            
            for entry in entries:
                if entry.remedy == remedy1:
                    remedy1_in_rubric = {
                        "grade": entry.grade,
                        "contribution": entry.grade * weight,
                        "source": entry.source
                    }
                elif entry.remedy == remedy2:
                    remedy2_in_rubric = {
                        "grade": entry.grade,
                        "contribution": entry.grade * weight,
                        "source": entry.source
                    }
            
            rubric_key = f"{rubric.chapter}/{rubric.main_rubric}"
            
            # Categorize
            if remedy1_in_rubric and remedy2_in_rubric:
                supporting_both.append({
                    "rubric": rubric_key,
                    "remedy1_grade": remedy1_in_rubric["grade"],
                    "remedy2_grade": remedy2_in_rubric["grade"],
                    "winner": remedy1 if remedy1_in_rubric["grade"] > remedy2_in_rubric["grade"] else remedy2 if remedy2_in_rubric["grade"] > remedy1_in_rubric["grade"] else "tie"
                })
                remedy1_data["total_score"] += remedy1_in_rubric["contribution"]
                remedy2_data["total_score"] += remedy2_in_rubric["contribution"]
                remedy1_data["appears_in"].append((rubric_key, remedy1_in_rubric["grade"]))
                remedy2_data["appears_in"].append((rubric_key, remedy2_in_rubric["grade"]))
            elif remedy1_in_rubric:
                supporting_1_only.append({
                    "rubric": rubric_key,
                    "grade": remedy1_in_rubric["grade"]
                })
                remedy1_data["total_score"] += remedy1_in_rubric["contribution"]
                remedy1_data["appears_in"].append((rubric_key, remedy1_in_rubric["grade"]))
            elif remedy2_in_rubric:
                supporting_2_only.append({
                    "rubric": rubric_key,
                    "grade": remedy2_in_rubric["grade"]
                })
                remedy2_data["total_score"] += remedy2_in_rubric["contribution"]
                remedy2_data["appears_in"].append((rubric_key, remedy2_in_rubric["grade"]))
        
        # Calculate averages
        if remedy1_data["appears_in"]:
            remedy1_data["avg_grade"] = sum(g for _, g in remedy1_data["appears_in"]) / len(remedy1_data["appears_in"])
        
        if remedy2_data["appears_in"]:
            remedy2_data["avg_grade"] = sum(g for _, g in remedy2_data["appears_in"]) / len(remedy2_data["appears_in"])
        
        return {
            "remedy1": {
                "name": remedy1,
                "total_score": remedy1_data["total_score"],
                "rubric_count": len(remedy1_data["appears_in"]),
                "avg_grade": round(remedy1_data["avg_grade"], 2)
            },
            "remedy2": {
                "name": remedy2,
                "total_score": remedy2_data["total_score"],
                "rubric_count": len(remedy2_data["appears_in"]),
                "avg_grade": round(remedy2_data["avg_grade"], 2)
            },
            "supporting_both": supporting_both,
            "supporting_1_only": supporting_1_only,
            "supporting_2_only": supporting_2_only
        }
