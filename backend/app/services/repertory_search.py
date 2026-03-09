"""
Repertory search and retrieval service.
Provides high-level queries over the loaded repertory database.
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.db.models import Repertory
from typing import List, Dict, Optional, Tuple
import difflib


class RepertorySearchService:
    """Service for searching and retrieving repertory entries."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def search_by_remedy(self, remedy_name: str, source: Optional[str] = None) -> List[Repertory]:
        """Search entries by remedy name."""
        query = self.db.query(Repertory).filter(
            Repertory.remedy.ilike(f"%{remedy_name}%")
        )
        
        if source:
            query = query.filter(Repertory.source == source)
        
        return query.all()
    
    def search_by_rubric(self, rubric_text: str, source: Optional[str] = None) -> List[Repertory]:
        """Search entries by rubric text (main_rubric or sub_condition)."""
        query = self.db.query(Repertory).filter(
            or_(
                Repertory.main_rubric.ilike(f"%{rubric_text}%"),
                Repertory.sub_condition.ilike(f"%{rubric_text}%")
            )
        )
        
        if source:
            query = query.filter(Repertory.source == source)
        
        return query.all()
    
    def search_by_chapter(self, chapter: str, source: Optional[str] = None) -> List[Repertory]:
        """Search entries by chapter."""
        query = self.db.query(Repertory).filter(
            Repertory.chapter.ilike(f"%{chapter}%")
        )
        
        if source:
            query = query.filter(Repertory.source == source)
        
        return query.all()
    
    def get_chapters(self, source: Optional[str] = None) -> List[str]:
        """Get all unique chapter names."""
        query = self.db.query(Repertory.chapter.distinct())
        
        if source:
            query = query.filter(Repertory.source == source)
        
        return sorted([row[0] for row in query.all()])
    
    def get_rubrics_for_chapter(self, chapter: str, source: Optional[str] = None) -> List[Dict]:
        """Get all rubrics within a chapter."""
        query = self.db.query(Repertory).filter(
            Repertory.chapter == chapter
        )
        
        if source:
            query = query.filter(Repertory.source == source)
        
        entries = query.all()
        
        # Return unique rubrics
        rubrics = {}
        for entry in entries:
            key = (entry.main_rubric, entry.sub_condition)
            if key not in rubrics:
                rubrics[key] = {
                    'main_rubric': entry.main_rubric,
                    'sub_condition': entry.sub_condition,
                    'remedies': []
                }
            rubrics[key]['remedies'].append({
                'remedy': entry.remedy,
                'grade': entry.grade,
                'source': entry.source
            })
        
        return list(rubrics.values())
    
    def get_remedies_for_rubric(self, chapter: str, main_rubric: str, 
                                sub_condition: Optional[str] = None, 
                                source: Optional[str] = None) -> List[Dict]:
        """Get all remedies for a specific rubric."""
        query = self.db.query(Repertory).filter(
            Repertory.chapter == chapter,
            Repertory.main_rubric == main_rubric
        )
        
        if sub_condition:
            query = query.filter(Repertory.sub_condition == sub_condition)
        
        if source:
            query = query.filter(Repertory.source == source)
        
        entries = query.all()
        
        return [
            {
                'remedy': e.remedy,
                'grade': e.grade,
                'source': e.source
            }
            for e in entries
        ]
    
    def fuzzy_search_rubric(self, query_text: str, limit: int = 10, 
                           source: Optional[str] = None) -> List[Tuple[Repertory, float]]:
        """Fuzzy search for rubrics using similarity matching."""
        # Get all rubrics
        all_rubrics = self.db.query(Repertory).all()
        
        if source:
            all_rubrics = [r for r in all_rubrics if r.source == source]
        
        # Build search strings for each entry
        rubric_texts = {}
        for entry in all_rubrics:
            text = f"{entry.chapter} {entry.main_rubric} {entry.sub_condition}".lower()
            if text not in rubric_texts:
                rubric_texts[text] = entry
        
        # Perform fuzzy matching
        matches = difflib.get_close_matches(
            query_text.lower(),
            rubric_texts.keys(),
            n=limit,
            cutoff=0.6
        )
        
        return [(rubric_texts[match], difflib.SequenceMatcher(
            None, query_text.lower(), match).ratio()
        ) for match in matches]
    
    def get_remedy_occurrence(self, remedy_name: str, source: Optional[str] = None) -> Dict:
        """Get statistics on how many times a remedy appears."""
        query = self.db.query(Repertory).filter(
            Repertory.remedy == remedy_name
        )
        
        if source:
            query = query.filter(Repertory.source == source)
        
        entries = query.all()
        
        # Group by grade
        by_grade = {}
        chapters = set()
        for entry in entries:
            grade = entry.grade
            if grade not in by_grade:
                by_grade[grade] = 0
            by_grade[grade] += 1
            chapters.add(entry.chapter)
        
        return {
            'remedy': remedy_name,
            'total_occurrences': len(entries),
            'by_grade': by_grade,
            'chapters': sorted(list(chapters)),
            'source': source or 'all'
        }
    
    def get_stats(self) -> Dict:
        """Get overall statistics about the repertory."""
        total = self.db.query(func.count(Repertory.id)).scalar()
        
        # Count by source
        by_source = {}
        for source in ['kent', 'boger']:
            count = self.db.query(func.count(Repertory.id)).filter(
                Repertory.source == source
            ).scalar()
            by_source[source] = count
        
        # Count unique chapters
        chapters = self.db.query(func.count(Repertory.chapter.distinct())).scalar()
        
        # Count by grade
        grades = self.db.query(Repertory.grade, func.count(Repertory.id)).group_by(
            Repertory.grade
        ).all()
        
        return {
            'total_entries': total,
            'by_source': by_source,
            'unique_chapters': chapters,
            'entries_by_grade': {grade: count for grade, count in grades}
        }
