// ── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  status: number;
  message: string;
  errors: Record<string, string[]> | null;
}

// ── User / Auth Types ───────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  license_number: string | null;
  is_active: boolean;
  role?: string;
  organization_id?: string;
  organization_name?: string;
  organization_clinic_type?: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  license_number?: string;
}

export interface LoginRequest {
  username: string; // email used as username for OAuth2 flow
  password: string;
}

// ── Case Types ──────────────────────────────────────────────────────────────

export interface Case {
  id: string;
  patient_id?: string;
  patient_name?: string;
  patient_display_id?: string;
  patient_age?: number;
  patient_gender?: string;
  status: string;
  assigned_doctor_id?: string;
  created_by_id?: string;
  chief_complaint: string | null;
  case_notes: string | null;
  symptoms: Symptom[] | null;
  mode: string;
  rag_analysis: Record<string, unknown> | null;
  remedy_name?: string | null;
  potency?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseCreate {
  patient_id?: string;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: string;
  chief_complaint?: string;
  case_notes?: string;
  symptoms?: Symptom[];
  mode?: string;
  remedy_name?: string;
  potency?: string;
}

export interface CaseUpdate {
  case_notes?: string;
  symptoms?: Symptom[];
  rag_analysis?: Record<string, unknown>;
  remedy_name?: string;
  potency?: string;
  status?: string;
}

// ── Symptom Types ───────────────────────────────────────────────────────────

export interface Symptom {
  id?: string;
  text?: string;
  name?: string;
  title?: string;
  category?: string;
  intensity?: number;
  modalities?: string[];
  region?: string;
  vitality_score?: number;
  status?: 'Active' | 'Improving' | 'Resolved';
  appearance_date?: string;
}

export interface SymptomSearchResult {
  chapter: string;
  main_rubric: string;
  sub_condition: string;
  similarity_score: number;
  remedy_count: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
}

export interface SymptomSearchResponse {
  symptom: string;
  count: number;
  results: SymptomSearchResult[];
}

// ── Decision Types ──────────────────────────────────────────────────────────

export interface Decision {
  id: string;
  case_id: string;
  remedy_name: string;
  potency: string | null;
  dose: string | null;
  reasoning: string | null;
  rejected_remedies: string[] | null;
  supporting_rubrics: string[] | null;
  confidence: string;
  created_at: string;
}

export interface DecisionCreate {
  remedy_name: string;
  potency?: string;
  dose?: string;
  reasoning?: string;
  rejected_remedies?: string[];
  supporting_rubrics?: string[];
  confidence?: string;
}

// ── Follow-up Types ─────────────────────────────────────────────────────────

export interface FollowUp {
  id: string;
  case_id: string;
  decision_id: string | null;
  days_since_dose: number | null;
  reaction: string | null;
  observations: string | null;
  new_symptoms: Symptom[] | null;
  notes: string | null;
  created_at: string;
}

export interface FollowUpCreate {
  decision_id?: string;
  days_since_dose?: number;
  reaction?: string;
  observations?: string;
  new_symptoms?: Array<Record<string, unknown>>;
  notes?: string;
}

// ── Remedy Types ────────────────────────────────────────────────────────────

export interface RemedyProfile {
  remedy: string;
  total_score: number;
  rubric_count: number;
  avg_grade: number;
  chapters_covered: string[];
  strong_chapters: Array<{ chapter: string; avg_grade: number }>;
  weak_chapters: Array<{ chapter: string; avg_grade: number }>;
  all_appearances: Array<Record<string, unknown>>;
}

// ── Audit Trail Types ───────────────────────────────────────────────────────

export interface AuditTrailEntry {
  type: 'decision' | 'follow-up';
  timestamp: string;
  remedy?: string;
  confidence?: string;
  reasoning?: string;
  reaction?: string;
  observations?: string;
}

export interface AuditTrailResponse {
  case_id: string;
  patient: string;
  audit_trail: AuditTrailEntry[];
}

// ── Multi-tenant / RBAC Types ───────────────────────────────────────────────

export interface Patient {
  id: string;
  organization_id?: string;
  display_id?: string;
  name: string;
  age?: number;
  gender?: string;
  contact_info?: Record<string, unknown>;
  created_at: string;
}

export interface PatientCreate {
  name: string;
  age?: number;
  gender?: string;
  contact_info?: Record<string, unknown>;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  organization_id?: string;
  scheduled_time: string;
  status: string;
  is_emergency?: boolean;
  created_at: string;
}

export interface AppointmentCreate {
  patient_id: string;
  doctor_id?: string;
  scheduled_time: string;
  status?: string;
}

export interface DoseAdministrationLog {
  id: string;
  case_id: string;
  patient_id: string;
  administered_by_id: string;
  remedy_name: string;
  dose: string;
  potency?: string;
  administered_at: string;
  immediate_reaction?: string;
  notes?: string;
}

export interface DoseLogCreate {
  case_id: string;
  remedy_name: string;
  dose: string;
  potency?: string;
  immediate_reaction?: string;
  notes?: string;
}

export interface EmployeeProfile {
  user_id: string;
  email: string;
  full_name?: string;
  role: string;
  department?: string;
  department_id?: string;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface DepartmentCreate {
  name: string;
  description?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  organization_id: string;
  patient_id: string;
  case_id?: string;
  amount_due: number;
  status: string;
  payment_method?: string;
  due_date?: string;
  created_at: string;
  items: InvoiceItem[];
}

export interface InvoiceCreate {
  patient_id: string;
  case_id?: string;
  items: { description: string; amount: number }[];
  due_date?: string;
}
