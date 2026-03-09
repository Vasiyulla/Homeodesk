"""
Symptom Search Service - Maps free-text symptoms to repertory rubrics.

This service takes natural language symptom input (e.g., "throbbing headache from stress")
and finds matching repertory rubrics using multiple search strategies.
"""

from typing import List, Dict, Optional, Set, Tuple
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session
import difflib

from app.db.models import Repertory
from app.services.repertory_search import RepertorySearchService


class SymptomSearchService:
    """
    Maps free-text symptoms to repertory rubrics.
    
    Uses multiple search algorithms:
    1. Component matching (search parts of symptom in chapter/rubric/subcondition)
    2. Similarity scoring based on word overlap
    3. Frequency-based relevance scoring
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.repertory = RepertorySearchService(db)
    
    def search_symptom(
        self,
        symptom_text: str,
        limit: int = 10,
        source: str = "both",
        min_confidence: str = "LOW"
    ) -> Dict:
        """
        Search for symptom in repertory and return matching rubrics.
        
        Uses multiple search strategies to find relevant rubrics.
        
        Args:
            symptom_text: Free-text symptom (e.g., "throbbing headache from stress")
            limit: Maximum rubrics to return
            source: "both", "kent", or "boger"
            min_confidence: Minimum confidence level to return ("LOW", "MEDIUM", "HIGH")
        
        Returns:
            {
                "symptom": input symptom,
                "count": number of results,
                "results": [rubrics with scores]
            }
        """
        # Get all unique rubrics from database
        query = self.db.query(
            Repertory.chapter,
            Repertory.main_rubric,
            Repertory.sub_condition,
            Repertory.source
        ).group_by(Repertory.chapter, Repertory.main_rubric, Repertory.sub_condition, Repertory.source)
        
        if source != "both":
            query = query.filter(Repertory.source == source)
        
        rubrics = query.all()
        
        if not rubrics:
            return {
                "symptom": symptom_text,
                "count": 0,
                "results": []
            }
        
        # Prepare symptom for matching
        symptom_words = set(w.lower() for w in symptom_text.split())
        symptom_lower = symptom_text.lower()
        
        # Score each rubric
        scored_results = []
        confidence_levels = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
        min_conf_level = confidence_levels.get(min_confidence, 0)
        
        for chapter, main_rubric, sub_condition, rubric_source in rubrics:
            # Build rubric text
            rubric_text = f"{chapter} {main_rubric} {sub_condition or ''}".lower()
            rubric_words = set(w.lower() for w in rubric_text.split())
            
            # Calculate multiple similarity metrics
            
            # 1. Word overlap (check how many symptom words appear in rubric)
            word_overlap = len(symptom_words & rubric_words) / len(symptom_words) if symptom_words else 0
            
            # 2. Sequence matching (overall text similarity)
            sequence_score = difflib.SequenceMatcher(None, symptom_lower, rubric_text).ratio()
            
            # 3. Check for partial word matches in main_rubric
            main_rubric_lower = main_rubric.lower()
            substring_match = any(word in main_rubric_lower for word in symptom_words if len(word) > 2)
            
            # Combined similarity: 50% word overlap, 30% sequence, 20% substring
            if substring_match:
                combined_similarity = (word_overlap * 0.5) + (sequence_score * 0.3) + (0.2)
            else:
                combined_similarity = (word_overlap * 0.5) + (sequence_score * 0.5)
            
            # If similarity is too low, skip
            if combined_similarity < 0.25:
                continue
            
            # Get remedy count for confidence
            remedy_count = self._get_rubric_remedy_count(
                chapter,
                main_rubric,
                sub_condition,
                rubric_source
            )
            
            # Calculate confidence
            confidence = self._score_confidence(combined_similarity, remedy_count)
            confidence_level = confidence_levels.get(confidence, 0)
            
            # Filter by minimum confidence
            if confidence_level < min_conf_level:
                continue
            
            scored_results.append({
                "chapter": chapter,
                "main_rubric": main_rubric,
                "sub_condition": sub_condition or "",
                "similarity_score": round(combined_similarity, 3),
                "remedy_count": remedy_count,
                "remedies": self._get_rubric_remedies(chapter, main_rubric, sub_condition, rubric_source),
                "confidence": confidence,
                "source": rubric_source
            })
        
        # Sort by similarity score (descending)
        scored_results.sort(key=lambda x: x["similarity_score"], reverse=True)
        
        # Limit results
        scored_results = scored_results[:limit]
        
        return {
            "symptom": symptom_text,
            "count": len(scored_results),
            "results": scored_results
        }
    
    def _get_rubric_remedy_count(
        self,
        chapter: str,
        main_rubric: str,
        sub_condition: Optional[str],
        source: Optional[str] = None
    ) -> int:
        """
        Count distinct remedies in a rubric.
        Used to score frequency/importance of a rubric.
        """
        query = self.db.query(
            func.count(func.distinct(Repertory.remedy))
        ).filter(
            Repertory.chapter == chapter,
            Repertory.main_rubric == main_rubric
        )
        
        if sub_condition:
            query = query.filter(Repertory.sub_condition == sub_condition)
        
        if source:
            query = query.filter(Repertory.source == source)
        
        count = query.scalar()
        return count or 0
    
    def _get_rubric_remedies(
        self,
        chapter: str,
        main_rubric: str,
        sub_condition: Optional[str],
        source: Optional[str] = None
    ) -> List[Dict]:
        """
        Get all remedies in a rubric, sorted by grade (descending: 4 to 1).
        Returns unique remedies with their highest grade.
        """
        query = self.db.query(
            Repertory.remedy,
            func.max(Repertory.grade).label('max_grade')
        ).filter(
            Repertory.chapter == chapter,
            Repertory.main_rubric == main_rubric
        )
        
        if sub_condition:
            query = query.filter(Repertory.sub_condition == sub_condition)
        
        if source:
            query = query.filter(Repertory.source == source)
        
        # Group by remedy to get max grade per remedy
        query = query.group_by(Repertory.remedy)
        
        # Execute and sort by grade descending
        remedies = query.all()
        # Sort by grade (highest first)
        remedies.sort(key=lambda x: x.max_grade or 0, reverse=True)
        
        return [
            {"name": r.remedy, "grade": r.max_grade or 0}
            for r in remedies
        ]
    
    def _score_confidence(self, similarity: float, remedy_count: int) -> str:
        """
        Determine confidence level based on:
        - Similarity score (text match quality)
        - Remedy count (how many remedies are in this rubric)
        
        HIGH:   Score >= 0.70
        MEDIUM: Score >= 0.45
        LOW:    Score < 0.45
        """
        # Weight: 70% similarity, 30% frequency
        # Normalize remedy count (cap at 50 remedies = max relevance)
        frequency_score = min(remedy_count / 50.0, 1.0)
        combined_score = (similarity * 0.7) + (frequency_score * 0.3)
        
        if combined_score >= 0.70:
            return "HIGH"
        elif combined_score >= 0.45:
            return "MEDIUM"
        else:
            return "LOW"
    
    def search_symptom_by_category(
        self,
        mental_symptoms: Optional[List[str]] = None,
        general_symptoms: Optional[List[str]] = None,
        particular_symptoms: Optional[List[str]] = None,
        causation_symptoms: Optional[List[str]] = None,
        source: str = "both"
    ) -> Dict:
        """
        Search symptoms organized by homeopathic categories.
        
        Returns rubrics grouped by category, useful for structured case-taking.
        """
        results = {}
        
        if mental_symptoms:
            results["Mental"] = []
            for symptom in mental_symptoms:
                search_result = self.search_symptom(symptom, limit=5, source=source)
                results["Mental"].extend(search_result["results"])
        
        if general_symptoms:
            results["General"] = []
            for symptom in general_symptoms:
                search_result = self.search_symptom(symptom, limit=5, source=source)
                results["General"].extend(search_result["results"])
        
        if particular_symptoms:
            results["Particular"] = []
            for symptom in particular_symptoms:
                search_result = self.search_symptom(symptom, limit=5, source=source)
                results["Particular"].extend(search_result["results"])
        
        if causation_symptoms:
            results["Causation"] = []
            for symptom in causation_symptoms:
                search_result = self.search_symptom(symptom, limit=5, source=source)
                results["Causation"].extend(search_result["results"])
        
        return results
    
    def get_top_rubrics_for_symptom(
        self,
        symptom_text: str,
        count: int = 3,
        source: str = "both"
    ) -> List[Dict]:
        """
        Get only the top N most relevant rubrics for a symptom.
        
        Useful for shortlisting and UI display.
        """
        result = self.search_symptom(symptom_text, limit=count, source=source)
        return result["results"]
