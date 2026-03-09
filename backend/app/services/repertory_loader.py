import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class RepertoryLoader:
    """Loads and manages normalized repertory data (Boger, Kent)."""
    
    def __init__(self):
        self.data: Dict[str, List[Dict[str, Any]]] = {}
        self.load_all()
    
    def load_all(self):
        """Load all available normalized repertory files."""
        base_path = Path(__file__).resolve().parents[2] / "data" / "normalized"
        for source in ['boger', 'kent']:
            path = base_path / f"{source}_normalized.json"
            if path.exists():
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        self.data[source] = json.load(f)
                    logger.info(f"Loaded {len(self.data[source])} entries from {source}")
                except Exception as e:
                    logger.error(f"Failed to load {source}: {e}")
            else:
                logger.warning(f"Repertory file not found: {path}")
    
    def get_by_source(self, source: str) -> List[Dict[str, Any]]:
        """Get all entries from a specific source."""
        return self.data.get(source, [])
    
    def get_all(self) -> List[Dict[str, Any]]:
        """Get all entries from all sources."""
        result = []
        for source_data in self.data.values():
            result.extend(source_data)
        return result
    
    def search_by_section(self, section: str, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """Filter entries by section."""
        results = []
        sources = [source] if source else self.data.keys()
        for src in sources:
            for entry in self.data.get(src, []):
                if entry.get('section', '').lower() == section.lower():
                    results.append(entry)
        return results
    
    def search_by_rubric_text(self, text: str, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search entries by rubric text (case-insensitive substring match)."""
        results = []
        text_lower = text.lower()
        sources = [source] if source else self.data.keys()
        for src in sources:
            for entry in self.data.get(src, []):
                if text_lower in entry.get('rubric', '').lower():
                    results.append(entry)
        return results
    
    def get_by_id(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """Get a single entry by its ID."""
        for source_data in self.data.values():
            for entry in source_data:
                if entry.get('id') == entry_id:
                    return entry
        return None


# Singleton instance
_loader: Optional[RepertoryLoader] = None


def get_loader() -> RepertoryLoader:
    """Get or create the singleton loader."""
    global _loader
    if _loader is None:
        _loader = RepertoryLoader()
    return _loader
