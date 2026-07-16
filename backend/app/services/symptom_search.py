"""
Symptom Search Service - Maps free-text symptoms to repertory rubrics via Pandas CSV Loader.
"""

from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from app.services.repertory_loader import get_loader

class SymptomSearchService:
    def __init__(self, db: Session):
        self.db = db
        self.loader = get_loader()
    
    def search_symptom(
        self,
        symptom_text: str,
        limit: int = 10,
        source: str = "both",
        min_confidence: str = "LOW"
    ) -> Dict:
        
        results = self.loader.search_symptoms(symptom_text, source=source, limit=limit)
        
        return {
            "symptom": symptom_text,
            "count": len(results),
            "results": results
        }
    
    def search_symptom_by_category(
        self,
        mental_symptoms: Optional[List[str]] = None,
        general_symptoms: Optional[List[str]] = None,
        particular_symptoms: Optional[List[str]] = None,
        causation_symptoms: Optional[List[str]] = None,
        source: str = "both"
    ) -> Dict:
        results = {}
        
        if mental_symptoms:
            results["Mental"] = []
            for symptom in mental_symptoms:
                results["Mental"].extend(self.search_symptom(symptom, limit=5, source=source)["results"])
        
        if general_symptoms:
            results["General"] = []
            for symptom in general_symptoms:
                results["General"].extend(self.search_symptom(symptom, limit=5, source=source)["results"])
        
        if particular_symptoms:
            results["Particular"] = []
            for symptom in particular_symptoms:
                results["Particular"].extend(self.search_symptom(symptom, limit=5, source=source)["results"])
        
        if causation_symptoms:
            results["Causation"] = []
            for symptom in causation_symptoms:
                results["Causation"].extend(self.search_symptom(symptom, limit=5, source=source)["results"])
        
        return results
    
    def get_top_rubrics_for_symptom(
        self,
        symptom_text: str,
        count: int = 3,
        source: str = "both"
    ) -> List[Dict]:
        return self.search_symptom(symptom_text, limit=count, source=source)["results"]
