"""
SQLAlchemy ORM models for the Homeopathy Case Management system.

All models use PostgreSQL-native types mapped to SQLite equivalents where necessary.
"""
from sqlalchemy import (
    Column, String, Integer, Text, DateTime, Float, Boolean,
    ForeignKey, UniqueConstraint,
)
from sqlalchemy import JSON as JSONB
from sqlalchemy import Uuid as UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base
import uuid


class Organization(Base):
    __tablename__ = "organizations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=True)
    clinic_type = Column(String(100), nullable=True)
    employee_count = Column(String(50), nullable=True)
    subscription_tier = Column(String(50), default="free")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class OrganizationUser(Base):
    __tablename__ = "organization_users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), nullable=False) # 'OWNER', 'DOCTOR', 'ASSISTANT', 'NURSE', 'PHARMACIST', 'ADMIN'


class Department(Base):
    __tablename__ = "departments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", backref="departments")


class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    employee_id_code = Column(String(50), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    shift = Column(String(50), nullable=True)
    certifications = Column(JSONB, nullable=True)
    
    department = relationship("Department")


class User(Base):
    """System user account."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    license_number = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Patient(Base):
    __tablename__ = "patients"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    display_id = Column(String(50), nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(10), nullable=True)
    contact_info = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    cases = relationship("Case", back_populates="patient")
    vitals = relationship("PatientVital", back_populates="patient", cascade="all, delete-orphan")


class PatientVital(Base):
    __tablename__ = "patient_vitals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    recorded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    
    height = Column(Float, nullable=True) # cm
    weight = Column(Float, nullable=True) # kg
    blood_pressure = Column(String(20), nullable=True) # e.g., '120/80'
    temperature = Column(Float, nullable=True) # F
    pulse = Column(Integer, nullable=True) # bpm
    notes = Column(Text, nullable=True)
    
    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    patient = relationship("Patient", back_populates="vitals")


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="scheduled")
    appointment_type = Column(String(50), default="in_person") # in_person, telemedicine
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    meeting_link = Column(String(255), nullable=True)
    is_emergency = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Case(Base):
    """A homeopathy patient case."""
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=True)
    
    @property
    def patient_display_id(self):
        return self.patient.display_id if self.patient else None
    
    assigned_doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    status = Column(String(50), default="DRAFT") # DRAFT, WAITING_FOR_DOCTOR, REMEDY_PRESCRIBED, UNDER_OBSERVATION, CLOSED

    chief_complaint = Column(Text, nullable=True)
    case_notes = Column(Text, nullable=True)
    symptoms = Column(JSONB, nullable=True)
    mode = Column(String(20), default="clinical")
    rag_analysis = Column(JSONB, nullable=True)
    remedy_name = Column(String(255), nullable=True)
    potency = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    patient = relationship("Patient", back_populates="cases")
    decisions = relationship("Decision", back_populates="case", cascade="all, delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="case", cascade="all, delete-orphan")

    @property
    def patient_name(self):
        return self.patient.name if self.patient else None

    @property
    def patient_age(self):
        return self.patient.age if self.patient else None

    @property
    def patient_gender(self):
        return self.patient.gender if self.patient else None

class Decision(Base):
    """Final remedy decision for a case."""
    __tablename__ = "decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False)
    remedy_name = Column(String(255), nullable=False)
    potency = Column(String(50), nullable=True)
    dose = Column(String(100), nullable=True)
    reasoning = Column(Text, nullable=True)
    rejected_remedies = Column(JSONB, nullable=True)
    supporting_rubrics = Column(JSONB, nullable=True)
    confidence = Column(String(20), default="medium")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Pharmacy dispensing workflow
    dispense_status = Column(String(20), default="PENDING")  # PENDING, DISPENSED
    dispensed_at = Column(DateTime(timezone=True), nullable=True)
    dispensed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    case = relationship("Case", back_populates="decisions")


class DoseAdministrationLog(Base):
    __tablename__ = "dose_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    administered_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    remedy_name = Column(String(255), nullable=False)
    dose = Column(String(100), nullable=False)
    potency = Column(String(50), nullable=True)
    administered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    immediate_reaction = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)


class FollowUp(Base):
    __tablename__ = "follow_ups"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False)
    decision_id = Column(UUID(as_uuid=True), ForeignKey("decisions.id"), nullable=True)
    days_since_dose = Column(Integer, nullable=True)
    reaction = Column(String(50), nullable=True)
    observations = Column(Text, nullable=True)
    new_symptoms = Column(JSONB, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    case = relationship("Case", back_populates="follow_ups")




class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=True)
    amount_due = Column(Float, nullable=False, default=0.0)
    status = Column(String(50), default="PENDING") # PENDING, PAID, OVERDUE
    payment_method = Column(String(50), nullable=True) # CASH, ONLINE
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    description = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    
    invoice = relationship("Invoice", back_populates="items")


class AuditLog(Base):
    """Immutable audit trail for all mutating actions."""
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False) # e.g. 'CREATE', 'UPDATE', 'DELETE'
    resource_type = Column(String(100), nullable=False) # e.g. 'Case', 'Patient', 'DoseAdministrationLog'
    resource_id = Column(String(100), nullable=True)
    payload_json = Column(JSONB, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Notification(Base):
    """System and user notifications."""
    __tablename__ = "notifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True) # If null, it's an org-wide broadcast
    
    type = Column(String(50), nullable=False, default="INFO") # INFO, SUCCESS, WARNING, ALERT
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    
    related_entity_type = Column(String(50), nullable=True) # e.g., 'CASE', 'APPOINTMENT'
    related_entity_id = Column(String(100), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Repertory(Base):
    """Repertory entries for homeopathy."""
    __tablename__ = "repertory"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter = Column(String(255), nullable=False, index=True)
    main_rubric = Column(String(255), nullable=False, index=True)
    sub_condition = Column(String(255), nullable=True, index=True)
    remedy = Column(String(255), nullable=False, index=True)
    grade = Column(Integer, nullable=False)
    source = Column(String(50), nullable=True, index=True)
    
    # Composite indexes could be added if needed

