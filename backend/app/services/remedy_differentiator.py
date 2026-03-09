"""
Remedy Differentiator Service - Detailed remedy comparison and analysis.

Provides comprehensive analysis of remedies to help practitioners choose between
shortlisted options by showing unique indications, specializations, and
head-to-head comparisons.
"""

from typing import List, Dict, Optional, Set, Tuple
from dataclasses import dataclass
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Repertory
from app.services.repertorization import SelectedRubric


@dataclass
class RemedyProfile:
    """Complete profile of a remedy across selected symptoms"""
    remedy: str
    total_score: float
    rubric_count: int
    avg_grade: float
    chapters_covered: List[str]
    strong_chapters: List[Tuple[str, float]]  # (chapter, avg_grade)
    weak_chapters: List[Tuple[str, float]]
    all_appearances: List[Dict]


@dataclass
class DifferentiationResult:
    """Result of comparing two remedies"""
    remedy1: str
    remedy2: str
    winner: Optional[str]  # Which is more suited to the case
    supporting_both: List[Dict]  # Rubrics where both appear
    supporting_1_only: List[Dict]  # Unique to remedy1
    supporting_2_only: List[Dict]  # Unique to remedy2
    strength_comparison: Dict  # How much stronger remedy1 is overall
    differentiation_summary: str  # Plain language explanation


class RemedyDifferentiatorService:
    """
    Analyzes and compares remedies to help practitioners make final decisions.
    
    Provides:
    1. Individual remedy profiles (showing strengths/weaknesses)
    2. Head-to-head comparisons (which remedy is better for this case)
    3. Unique indications (what each remedy specializes in)
    4. Complementary analysis (remedies that work together)
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_remedy_profile(
        self,
        remedy: str,
        rubrics: List[SelectedRubric],
        weights: Optional[Dict[str, int]] = None
    ) -> RemedyProfile:
        """
        Get complete profile of a remedy across selected symptoms.
        
        Shows:
        - Total coverage score
        - Which chapters/symptoms it covers best
        - Where it's weak
        - Grade distribution
        """
        if weights is None:
            weights = {
                "Mental": 5,
                "General": 3,
                "Particular": 2,
                "Causation": 1
            }
        
        # Get all appearances in selected rubrics
        appearances = []
        chapters_seen = set()
        chapter_scores = {}  # chapter -> list of (grade, weight)
        total_score = 0
        
        for rubric in rubrics:
            # Query this rubric for our remedy
            query = self.db.query(Repertory).filter(
                Repertory.remedy == remedy,
                Repertory.chapter == rubric.chapter,
                Repertory.main_rubric == rubric.main_rubric
            )
            
            if rubric.sub_condition:
                query = query.filter(Repertory.sub_condition == rubric.sub_condition)
            
            entries = query.all()
            
            weight = weights.get(rubric.category, 1)
            
            for entry in entries:
                chapters_seen.add(entry.chapter)
                
                if entry.chapter not in chapter_scores:
                    chapter_scores[entry.chapter] = []
                
                chapter_scores[entry.chapter].append((entry.grade, weight))
                
                appearances.append({
                    "chapter": entry.chapter,
                    "main_rubric": entry.main_rubric,
                    "sub_condition": entry.sub_condition or "",
                    "category": rubric.category,
                    "grade": entry.grade,
                    "weight": weight,
                    "contribution": entry.grade * weight,
                    "source": entry.source
                })
                
                total_score += entry.grade * weight
        
        # Calculate chapter strengths
        strong_chapters = []
        weak_chapters = []
        
        for chapter, scores in chapter_scores.items():
            avg_grade = sum(g for g, w in scores) / len(scores)
            strong_chapters.append((chapter, avg_grade))
        
        # Sort by strength
        strong_chapters.sort(key=lambda x: x[1], reverse=True)
        
        # Identify weak chapters (below 2.0)
        weak_chapters = [(ch, grade) for ch, grade in strong_chapters if grade < 2.0]
        strong_chapters = [(ch, grade) for ch, grade in strong_chapters if grade >= 2.0]
        
        # Calculate statistics
        avg_grade = sum(a["grade"] for a in appearances) / len(appearances) if appearances else 0
        rubric_count = len(set((a["chapter"], a["main_rubric"], a["sub_condition"]) for a in appearances))
        
        return RemedyProfile(
            remedy=remedy,
            total_score=total_score,
            rubric_count=rubric_count,
            avg_grade=round(avg_grade, 2),
            chapters_covered=sorted(list(chapters_seen)),
            strong_chapters=strong_chapters,
            weak_chapters=weak_chapters,
            all_appearances=appearances
        )
    
    def get_shortlist_analysis(
        self,
        remedies: List[str],
        rubrics: List[SelectedRubric],
        weights: Optional[Dict[str, int]] = None
    ) -> Dict:
        """
        Analyze multiple remedies and identify unique indications for each.
        
        Shows what each remedy in the shortlist specializes in.
        Helps practitioners choose between similar remedies.
        """
        if weights is None:
            weights = {
                "Mental": 5,
                "General": 3,
                "Particular": 2,
                "Causation": 1
            }
        
        # Get profile for each remedy
        profiles = {}
        for remedy in remedies:
            profiles[remedy] = self.get_remedy_profile(remedy, rubrics, weights)
        
        # Identify unique indications for each remedy
        # (appears in this symptom in this remedy but not others)
        unique_indications = {}
        
        for rubric in rubrics:
            # Get all remedies in this rubric
            query = self.db.query(Repertory).filter(
                Repertory.chapter == rubric.chapter,
                Repertory.main_rubric == rubric.main_rubric
            )
            
            if rubric.sub_condition:
                query = query.filter(Repertory.sub_condition == rubric.sub_condition)
            
            entries = query.all()
            remedies_in_rubric = set(e.remedy for e in entries)
            
            # For each remedy in our shortlist
            for remedy in remedies:
                if remedy not in unique_indications:
                    unique_indications[remedy] = []
                
                # Check if it appears in this rubric
                remedy_entries = [e for e in entries if e.remedy == remedy]
                
                if remedy_entries:
                    # Check if any other remedy in shortlist appears here
                    other_remedies_here = [r for r in remedies if r != remedy and r in remedies_in_rubric]
                    
                    # If no other shortlist remedies here, it's unique
                    if not other_remedies_here:
                        unique_indications[remedy].append({
                            "chapter": rubric.chapter,
                            "main_rubric": rubric.main_rubric,
                            "sub_condition": rubric.sub_condition or "",
                            "grades": [e.grade for e in remedy_entries],
                            "avg_grade": sum(e.grade for e in remedy_entries) / len(remedy_entries)
                        })
        
        # Prepare summary
        analysis = {
            "shortlist_size": len(remedies),
            "remedies": []
        }
        
        for remedy in sorted(remedies, key=lambda r: profiles[r].total_score, reverse=True):
            profile = profiles[remedy]
            analysis["remedies"].append({
                "rank": len(analysis["remedies"]) + 1,
                "remedy": remedy,
                "total_score": profile.total_score,
                "rubric_count": profile.rubric_count,
                "avg_grade": profile.avg_grade,
                "chapters_covered": profile.chapters_covered,
                "strong_chapters": [ch_and_grade for ch_and_grade in profile.strong_chapters],
                "unique_indications_count": len(unique_indications.get(remedy, [])),
                "unique_indications": unique_indications.get(remedy, [])[:3]  # Show top 3
            })
        
        return analysis
    
    def compare_pair(
        self,
        remedy1: str,
        remedy2: str,
        rubrics: List[SelectedRubric],
        weights: Optional[Dict[str, int]] = None
    ) -> DifferentiationResult:
        """
        Detailed head-to-head comparison of two remedies.
        
        Determines which is more suitable for the case based on:
        - Overall coverage (more rubrics)
        - Grade strength (higher average grade)
        - Specialization (unique indications)
        """
        if weights is None:
            weights = {
                "Mental": 5,
                "General": 3,
                "Particular": 2,
                "Causation": 1
            }
        
        # Get profiles
        profile1 = self.get_remedy_profile(remedy1, rubrics, weights)
        profile2 = self.get_remedy_profile(remedy2, rubrics, weights)
        
        # Categorize appearances
        supporting_both = []
        supporting_1_only = []
        supporting_2_only = []
        
        # Build maps for quick lookup
        remedy1_map = {}  # (chapter, main_rubric, sub) -> list of appearances
        remedy2_map = {}
        
        for app in profile1.all_appearances:
            key = (app["chapter"], app["main_rubric"], app["sub_condition"])
            if key not in remedy1_map:
                remedy1_map[key] = []
            remedy1_map[key].append(app)
        
        for app in profile2.all_appearances:
            key = (app["chapter"], app["main_rubric"], app["sub_condition"])
            if key not in remedy2_map:
                remedy2_map[key] = []
            remedy2_map[key].append(app)
        
        # Compare
        all_keys = set(remedy1_map.keys()) | set(remedy2_map.keys())
        
        for key in all_keys:
            chapter, main_rubric, sub = key
            
            r1_apps = remedy1_map.get(key, [])
            r2_apps = remedy2_map.get(key, [])
            
            if r1_apps and r2_apps:
                # Both appear
                r1_grade = r1_apps[0]["grade"]
                r2_grade = r2_apps[0]["grade"]
                
                supporting_both.append({
                    "rubric": f"{chapter}/{main_rubric}" + (f"/{sub}" if sub else ""),
                    "remedy1": remedy1,
                    "remedy2": remedy2,
                    "remedy1_grade": r1_grade,
                    "remedy2_grade": r2_grade,
                    "winner": remedy1 if r1_grade > r2_grade else remedy2 if r2_grade > r1_grade else "tie",
                    "strength_diff": abs(r1_grade - r2_grade)
                })
            elif r1_apps:
                supporting_1_only.append({
                    "rubric": f"{chapter}/{main_rubric}" + (f"/{sub}" if sub else ""),
                    "grade": r1_apps[0]["grade"]
                })
            else:
                supporting_2_only.append({
                    "rubric": f"{chapter}/{main_rubric}" + (f"/{sub}" if sub else ""),
                    "grade": r2_apps[0]["grade"]
                })
        
        # Determine winner
        if profile1.total_score > profile2.total_score:
            winner = remedy1
            strength_diff = profile1.total_score - profile2.total_score
        elif profile2.total_score > profile1.total_score:
            winner = remedy2
            strength_diff = profile2.total_score - profile1.total_score
        else:
            winner = None
            strength_diff = 0
        
        # Generate summary
        summary = self._generate_summary(
            remedy1, remedy2, profile1, profile2, supporting_both,
            supporting_1_only, supporting_2_only, winner
        )
        
        return DifferentiationResult(
            remedy1=remedy1,
            remedy2=remedy2,
            winner=winner,
            supporting_both=supporting_both,
            supporting_1_only=supporting_1_only,
            supporting_2_only=supporting_2_only,
            strength_comparison={
                f"{remedy1}_score": profile1.total_score,
                f"{remedy2}_score": profile2.total_score,
                "difference": strength_diff,
                f"{remedy1}_rubric_count": profile1.rubric_count,
                f"{remedy2}_rubric_count": profile2.rubric_count,
                f"{remedy1}_avg_grade": profile1.avg_grade,
                f"{remedy2}_avg_grade": profile2.avg_grade
            },
            differentiation_summary=summary
        )
    
    def _generate_summary(
        self,
        remedy1: str,
        remedy2: str,
        profile1: RemedyProfile,
        profile2: RemedyProfile,
        both: List[Dict],
        only1: List[Dict],
        only2: List[Dict],
        winner: Optional[str]
    ) -> str:
        """Generate plain language summary of differentiation."""
        
        lines = []
        
        # Overall assessment
        if winner:
            if winner == remedy1:
                lines.append(f"{remedy1} is the stronger choice for this case (score: {profile1.total_score} vs {profile2.total_score}).")
            else:
                lines.append(f"{remedy2} is the stronger choice for this case (score: {profile2.total_score} vs {profile1.total_score}).")
        else:
            lines.append(f"Both remedies are equally strong for this case (score: {profile1.total_score}).")
        
        # Coverage
        lines.append("")
        lines.append(f"Coverage: {remedy1} appears in {profile1.rubric_count} symptoms (avg grade {profile1.avg_grade}), {remedy2} in {profile2.rubric_count} (avg grade {profile2.avg_grade}).")
        
        # Shared symptoms
        if both:
            strong_agree = sum(1 for b in both if b["winner"] != "tie")
            lines.append(f"Both remedies cover {len(both)} shared symptoms; {remedy1 if both[0]['winner'] == remedy1 else remedy2} is generally stronger in these.")
        
        # Unique indications
        if only1:
            lines.append(f"{remedy1} uniquely covers {len(only1)} symptoms; {remedy2} does not appear there.")
        
        if only2:
            lines.append(f"{remedy2} uniquely covers {len(only2)} symptoms; {remedy1} does not appear there.")
        
        # Recommendation
        lines.append("")
        if only1 and not only2:
            lines.append(f"Recommendation: {remedy1} is more specialized for this case.")
        elif only2 and not only1:
            lines.append(f"Recommendation: {remedy2} is more specialized for this case.")
        elif not only1 and not only2:
            lines.append("Recommendation: Either remedy would work; choose based on patient constitution or previous response.")
        else:
            lines.append("Recommendation: Consider both remedy's strong points; may need to pick based on other factors.")
        
        return " ".join(lines)
