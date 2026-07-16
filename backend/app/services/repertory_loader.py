import pandas as pd
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class RepertoryLoader:
    """Loads and manages repertory data directly from CSV using Pandas for high performance."""
    
    def __init__(self):
        self.dfs: Dict[str, pd.DataFrame] = {}
        self.combined_df: Optional[pd.DataFrame] = None
        self.all_remedies_cache: List[str] = []
        self.remedy_pattern = re.compile(r'([a-zA-Z0-9\-]+)\.\((\d+)\)')
        self.load_all()
    
    def _parse_remedies(self, remedy_str: str) -> List[Dict[str, Any]]:
        if not isinstance(remedy_str, str):
            return []
        matches = self.remedy_pattern.findall(remedy_str)
        return [{"name": f"{name}.", "grade": int(grade)} for name, grade in matches]

    def load_all(self):
        """Load Boger and Kent CSVs into memory."""
        base_path = Path(__file__).resolve().parents[2] / "data" / "repertories"
        
        sources = {
            'boger': base_path / "error_free_boger.csv",
            'kent': base_path / "error_free_kent.csv"
        }
        
        all_dfs = []
        
        for source, path in sources.items():
            if path.exists():
                try:
                    df = pd.read_csv(path)
                    
                    # Fill NaNs
                    df.fillna('', inplace=True)
                    
                    # Create Rubric_Text for fast searching
                    df['Rubric_Text'] = df['Chapter'] + " - " + df['Main_Rubric']
                    mask = (df['Sub_Condition'] != '') & (df['Sub_Condition'] != df['Main_Rubric'])
                    df.loc[mask, 'Rubric_Text'] = df.loc[mask, 'Rubric_Text'] + " - " + df.loc[mask, 'Sub_Condition']
                    
                    # Add lowercase version for case-insensitive searching
                    df['Search_Text'] = df['Rubric_Text'].str.lower()
                    
                    # Parse remedies
                    df['Parsed_Remedies'] = df['Remedy'].apply(self._parse_remedies)
                    df['Remedy_Count'] = df['Parsed_Remedies'].apply(len)
                    
                    # Tag source
                    df['Source'] = source.capitalize()
                    
                    self.dfs[source.capitalize()] = df
                    all_dfs.append(df)
                    
                    logger.info(f"Loaded {len(df)} rubrics from {source.capitalize()} CSV")
                except Exception as e:
                    logger.error(f"Failed to load {source} CSV: {e}")
            else:
                logger.warning(f"Repertory CSV not found: {path}")
                
        if all_dfs:
            self.combined_df = pd.concat(all_dfs, ignore_index=True)
            
            # Pre-compute all unique remedies
            unique_remedies = set()
            for remedies_list in self.combined_df['Parsed_Remedies']:
                for r in remedies_list:
                    unique_remedies.add(r['name'])
            self.all_remedies_cache = sorted(list(unique_remedies))
            
            logger.info(f"Combined Repertory DataFrame ready with {len(self.combined_df)} total rubrics and {len(self.all_remedies_cache)} unique remedies.")


    def search_symptoms(self, text: str, source: str = "both", limit: int = 10) -> List[Dict[str, Any]]:
        """Fast vectorized search across rubrics."""
        if self.combined_df is None:
            return []
            
        df = self.combined_df
        if source.lower() != "both":
            df = df[df['Source'].str.lower() == source.lower()]
            
        # Case insensitive substring search
        text_lower = text.lower()
        
        # Simple contains match
        mask = df['Search_Text'].str.contains(text_lower, regex=False, na=False)
        matched_df = df[mask]
        
        # We can add exact word match boosting, but for now just sort by Remedy_Count to show biggest rubrics first, or length to show exact matches
        # Sort by shortest string length (most exact match) then by remedy count
        matched_df = matched_df.assign(Text_Length=matched_df['Search_Text'].str.len())
        matched_df = matched_df.sort_values(['Text_Length', 'Remedy_Count'], ascending=[True, False])
        
        results = []
        for _, row in matched_df.head(limit).iterrows():
            results.append({
                "chapter": row['Chapter'],
                "main_rubric": row['Main_Rubric'],
                "sub_condition": row['Sub_Condition'],
                "remedy_count": row['Remedy_Count'],
                "remedies": row['Parsed_Remedies'],
                "source": row['Source'],
                "similarity_score": 1.0, # Dummy for now
                "confidence": "HIGH" if row['Remedy_Count'] > 5 else "MEDIUM"
            })
            
        return results

    def get_rubric_exact(self, chapter: str, main_rubric: str, sub_condition: str = "", source: str = "both") -> List[Dict[str, Any]]:
        """Get a specific rubric exactly."""
        if self.combined_df is None:
            return []
            
        df = self.combined_df
        if source.lower() != "both":
            df = df[df['Source'].str.lower() == source.lower()]
            
        mask = (df['Chapter'].str.lower() == chapter.lower()) & (df['Main_Rubric'].str.lower() == main_rubric.lower())
        if sub_condition:
            mask = mask & (df['Sub_Condition'].str.lower() == sub_condition.lower())
            
        matched_df = df[mask]
        
        results = []
        for _, row in matched_df.iterrows():
            results.append({
                "chapter": row['Chapter'],
                "main_rubric": row['Main_Rubric'],
                "sub_condition": row['Sub_Condition'],
                "remedies": row['Parsed_Remedies'],
                "source": row['Source']
            })
        return results

    def get_rubrics_by_chapter(self, chapter: str, source: str = "both") -> List[Dict[str, Any]]:
        """Get all rubrics for a specific chapter."""
        if self.combined_df is None:
            return []
            
        df = self.combined_df
        if source.lower() != "both":
            df = df[df['Source'].str.lower() == source.lower()]
            
        mask = df['Chapter'].str.lower() == chapter.lower()
        matched_df = df[mask].sort_values(['Main_Rubric', 'Sub_Condition'])
        
        results = []
        for _, row in matched_df.iterrows():
            results.append({
                "main_rubric": row['Main_Rubric'],
                "sub_condition": row['Sub_Condition'],
                "remedy_count": row['Remedy_Count'],
                "source": row['Source']
            })
        return results

    def get_sections(self) -> List[str]:
        if self.combined_df is None:
            return []
        return sorted(self.combined_df['Chapter'].unique().tolist())

    def get_all_remedies(self) -> List[str]:
        """Return a sorted list of all unique remedies."""
        return self.all_remedies_cache

    def get_rubrics_by_remedy(self, remedy_name: str, source: str = "both") -> List[Dict[str, Any]]:
        """Get all rubrics that contain a specific remedy."""
        if self.combined_df is None:
            return []
            
        df = self.combined_df
        if source.lower() != "both":
            df = df[df['Source'].str.lower() == source.lower()]
            
        # We need to filter where remedy_name is in Parsed_Remedies
        # remedy_name might be "Acon." or "Acon"
        clean_remedy = remedy_name if remedy_name.endswith('.') else f"{remedy_name}."
        clean_remedy_lower = clean_remedy.lower()
        
        # This is a bit slow for every request, but works for the current scale.
        def has_remedy(remedies_list):
            for r in remedies_list:
                if r['name'].lower() == clean_remedy_lower:
                    return r['grade']
            return 0
            
        grades = df['Parsed_Remedies'].apply(has_remedy)
        mask = grades > 0
        matched_df = df[mask].copy()
        matched_df['Specific_Grade'] = grades[mask]
        
        # Sort by grade (desc) then chapter
        matched_df = matched_df.sort_values(['Specific_Grade', 'Chapter', 'Main_Rubric'], ascending=[False, True, True])
        
        results = []
        for _, row in matched_df.iterrows():
            results.append({
                "chapter": row['Chapter'],
                "main_rubric": row['Main_Rubric'],
                "sub_condition": row['Sub_Condition'],
                "grade": row['Specific_Grade'],
                "source": row['Source']
            })
        return results

# Singleton instance
_loader: Optional[RepertoryLoader] = None

def get_loader() -> RepertoryLoader:
    """Get or create the singleton loader."""
    global _loader
    if _loader is None:
        _loader = RepertoryLoader()
    return _loader
