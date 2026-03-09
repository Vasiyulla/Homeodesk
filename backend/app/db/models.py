"""
SQLAlchemy models for cases, decisions, and follow-ups.
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, Float, JSON, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base
import uuid


class Case(Base):
    """A homeopathy patient case."""
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    practitioner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    patient_name = Column(String(255), nullable=True)
    patient_age = Column(Integer, nullable=True)
    patient_gender = Column(String(10), nullable=True)
    
    chief_complaint = Column(Text, nullable=True)
    case_notes = Column(Text, nullable=True)
    
    # Structured symptoms (JSON: list of {text, category, intensity, modalities})
    symptoms = Column(JSON, nullable=True)
    
    # Mode: 'clinical' or 'dynamic'
    mode = Column(String(20), default="clinical")
    
    # Analysis results from RAG (JSON)
    rag_analysis = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    decisions = relationship("Decision", back_populates="case", cascade="all, delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="case", cascade="all, delete-orphan")


class Decision(Base):
    """Final remedy decision for a case."""
    __tablename__ = "decisions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False)
    
    # Chosen remedy
    remedy_name = Column(String(255), nullable=False)
    
    # Potency and dose
    potency = Column(String(50), nullable=True)
    dose = Column(String(100), nullable=True)
    
    # Reasoning
    reasoning = Column(Text, nullable=True)  # Why this remedy was chosen
    rejected_remedies = Column(JSON, nullable=True)  # List of alternatives considered
    
    # Supporting rubrics used
    supporting_rubrics = Column(JSON, nullable=True)
    
    # Confidence level
    confidence = Column(String(20), default="medium")  # high, medium, low
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    case = relationship("Case", back_populates="decisions")


class FollowUp(Base):
    """Patient follow-up observation after remedy."""
    __tablename__ = "follow_ups"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False)
    decision_id = Column(String(36), ForeignKey("decisions.id"), nullable=True)
    
    # Timeline
    days_since_dose = Column(Integer, nullable=True)
    
    # Observations
    reaction = Column(String(50), nullable=True)  # aggravation, amelioration, no_change, new_symptoms
    observations = Column(Text, nullable=True)
    
    # New symptoms observed
    new_symptoms = Column(JSON, nullable=True)
    
    # Practitioner notes
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    case = relationship("Case", back_populates="follow_ups")


class Repertory(Base):
    """Unified repertory entry from Kent or Boger."""
    __tablename__ = "repertory"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Normalized chapter (e.g., "Mind", "Head", "Chest")
    chapter = Column(String(255), nullable=False, index=True)
    
    # Main rubric (e.g., "Absent-minded", "Anxiety")
    main_rubric = Column(String(500), nullable=False, index=True)
    
    # Specific condition/modality (e.g., "periodical attacks", "during menses")
    sub_condition = Column(String(1000), nullable=False)
    
    # Remedy name (normalized, e.g., "Nux-v", "Puls")
    remedy = Column(String(100), nullable=False, index=True)
    
    # Grade/weight (1-4)
    grade = Column(Integer, nullable=False)
    
    # Source repertory
    source = Column(String(20), nullable=False)  # "kent" or "boger"
    
    # Full text for RAG indexing
    rubric_text = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Unique constraint: no duplicate chapter/rubric/condition/remedy from same source
    __table_args__ = (
        UniqueConstraint("chapter", "main_rubric", "sub_condition", "remedy", "source", name="uq_repertory_entry"),
    )


class User(Base):
    """Practitioner user account."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    
    # License/credentials
    license_number = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    cases = relationship("Case", foreign_keys=[Case.practitioner_id])
