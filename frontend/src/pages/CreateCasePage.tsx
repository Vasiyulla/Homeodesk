import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCaseStore } from '../store/store';
import { caseApi } from '../services/caseApi';
import { patientApi, type PatientDetail } from '../services/patientApi';
import { validateRequiredField, validateAge } from '../utils/validation';
import { formatDate, formatRelativeDate } from '../utils/dateFormatter';
import { formatCaseStatus } from '../utils/statusFormatter';
import Container from '../components/Container';
import Card from '../components/Card';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import TextAreaField from '../components/TextAreaField';
import Button from '../components/Button';
import ErrorAlert from '../components/ErrorAlert';
import SuccessMessage from '../components/SuccessMessage';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ArrowLeft, User, Activity, Search, FileText,
  ChevronDown, ChevronUp, Clock, Pill, Plus, UserCheck, UserPlus, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Patient } from '../types';

const CreateCasePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addCase } = useCaseStore();

  const state = location.state as { patientId?: string, patientName?: string, patientAge?: number, patientGender?: string } || {};

  // Patient search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [caseHistory, setCaseHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form data
  const [formData, setFormData] = useState({
    patient_id: state.patientId || '',
    patient_name: state.patientName || '',
    patient_age: state.patientAge ? String(state.patientAge) : '',
    patient_gender: state.patientGender || '',
    chief_complaint: '',
    case_notes: '',
    mode: 'dynamic'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<{ message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // If navigated with a patientId (e.g. from patients page), load that patient
  useEffect(() => {
    if (state.patientId) {
      patientApi.getById(state.patientId).then(result => {
        if (result.success && result.data) {
          const p = result.data;
          setSelectedPatient(p);
          setPatientDetail(p);
          setFormData(prev => ({
            ...prev,
            patient_id: p.id,
            patient_name: p.name,
            patient_age: p.age ? String(p.age) : '',
            patient_gender: p.gender || '',
          }));
          loadCaseHistory(p.id);
        }
      });
    }
  }, [state.patientId]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced patient search
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const result = await patientApi.list(query.trim());
      if (result.success && result.data) {
        setSearchResults(result.data);
        setShowDropdown(true);
      }
      setIsSearching(false);
    }, 300);
  }, []);

  const loadCaseHistory = async (patientId: string) => {
    setHistoryLoading(true);
    const result = await caseApi.getPatientCaseHistory(patientId);
    if (result.success && result.data) {
      setCaseHistory(result.data);
    }
    setHistoryLoading(false);
  };

  const handleSelectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setShowDropdown(false);
    setIsNewPatient(false);
    setFormData(prev => ({
      ...prev,
      patient_id: patient.id,
      patient_name: patient.name,
      patient_age: patient.age ? String(patient.age) : '',
      patient_gender: patient.gender || '',
    }));

    // Load details and case history
    const detailResult = await patientApi.getById(patient.id);
    if (detailResult.success && detailResult.data) {
      setPatientDetail(detailResult.data);
    }
    loadCaseHistory(patient.id);
  };

  const handleNewPatient = () => {
    setSelectedPatient(null);
    setPatientDetail(null);
    setCaseHistory(null);
    setIsNewPatient(true);
    setShowDropdown(false);
    setFormData(prev => ({
      ...prev,
      patient_id: '',
      patient_name: searchQuery,
      patient_age: '',
      patient_gender: '',
    }));
  };

  const handleClearSelection = () => {
    setSelectedPatient(null);
    setPatientDetail(null);
    setCaseHistory(null);
    setIsNewPatient(false);
    setSearchQuery('');
    setFormData(prev => ({
      ...prev,
      patient_id: '',
      patient_name: '',
      patient_age: '',
      patient_gender: '',
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!validateRequiredField(formData.patient_name)) {
      newErrors.patient_name = 'Patient name is required';
    }

    if (!isNewPatient && !selectedPatient && !formData.patient_id) {
      // Only validate age/gender if creating new patient
    }

    if (isNewPatient) {
      if (formData.patient_age && !validateAge(formData.patient_age)) {
        newErrors.patient_age = 'Age must be between 1 and 149';
      }
    }

    if (!validateRequiredField(formData.chief_complaint)) {
      newErrors.chief_complaint = 'Chief complaint is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setApiError(null);
    setSuccessMessage('');

    try {
      const result = await caseApi.createCase({
        patient_id: formData.patient_id || undefined,
        patient_name: formData.patient_name,
        patient_age: formData.patient_age ? parseInt(formData.patient_age, 10) : undefined,
        patient_gender: formData.patient_gender || undefined,
        chief_complaint: formData.chief_complaint,
        case_notes: formData.case_notes,
        mode: formData.mode,
        symptoms: []
      });

      if (result.success && result.data) {
        addCase(result.data);
        setSuccessMessage('Case created successfully! Redirecting...');
        setTimeout(() => navigate(`/cases/${result.data!.id}`), 1500);
      } else {
        setApiError(result.error || { message: 'Failed to create case' });
      }
    } catch (error) {
      setApiError({ message: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <Container narrow>
      <button
        onClick={() => navigate('/cases')}
        className="flex items-center text-sm font-medium text-surface-500 hover:text-surface-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Cases
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900">Create New Case</h1>
        <p className="text-surface-500 mt-1">Search for an existing patient or register a new one</p>
      </div>

      {apiError && <ErrorAlert error={apiError} onClose={() => setApiError(null)} className="mb-6" />}
      {successMessage && <SuccessMessage message={successMessage} onClose={() => setSuccessMessage('')} />}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ─── Step 1: Patient Search ─────────────────────────────────────── */}
        {!selectedPatient && !isNewPatient && (
          <Card className="border-2 border-dashed border-brand-200 bg-gradient-to-br from-brand-50/30 to-white">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                <Search className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h3 className="font-bold text-surface-900">Find Patient</h3>
                <p className="text-sm text-surface-500">Search by name, phone, or patient ID</p>
              </div>
            </div>

            <div className="relative" ref={dropdownRef}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Type patient name, phone number, or P-XXXX..."
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-surface-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-surface-900 text-base"
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute z-30 w-full mt-2 bg-white border border-surface-200 rounded-xl shadow-xl overflow-hidden"
                  >
                    {searchResults.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto">
                        {searchResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPatient(p)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 transition-colors text-left border-b border-surface-50 last:border-none"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-brand-700 font-bold flex-shrink-0">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-surface-900 truncate">
                                {p.name}
                                {p.display_id && <span className="text-surface-400 font-normal text-xs ml-2">({p.display_id})</span>}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-surface-500">
                                {p.age && <span>{p.age} yrs</span>}
                                {p.gender && <span>{p.gender}</span>}
                                {p.contact_info && (p.contact_info as any).phone && <span>{(p.contact_info as any).phone}</span>}
                              </div>
                            </div>
                            <UserCheck className="w-5 h-5 text-brand-400" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-surface-500">No patients found for "{searchQuery}"</p>
                      </div>
                    )}

                    {/* "Add New" option always at the bottom */}
                    <button
                      type="button"
                      onClick={handleNewPatient}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-surface-50 hover:bg-emerald-50 transition-colors text-left border-t border-surface-200"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-700">Register New Patient</p>
                        <p className="text-xs text-surface-500">Create a new patient record{searchQuery ? ` for "${searchQuery}"` : ''}</p>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick "Register New" below search */}
            {!showDropdown && !searchQuery && (
              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-surface-200" />
                <span className="text-xs text-surface-400 font-medium">or</span>
                <div className="h-px flex-1 bg-surface-200" />
              </div>
            )}
            {!showDropdown && !searchQuery && (
              <button
                type="button"
                onClick={handleNewPatient}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-surface-300 rounded-xl text-surface-600 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium text-sm">Register New Patient</span>
              </button>
            )}
          </Card>
        )}

        {/* ─── Selected Patient Banner ─────────────────────────────────── */}
        {selectedPatient && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="!p-4 bg-gradient-to-r from-brand-50 to-emerald-50 border-brand-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-200 to-brand-300 flex items-center justify-center text-brand-800 font-bold text-lg shadow-sm">
                    {selectedPatient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-surface-900 text-lg">{selectedPatient.name}</h3>
                      {selectedPatient.display_id && (
                        <Badge variant="primary">{selectedPatient.display_id}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-surface-600 mt-0.5">
                      {selectedPatient.age && <span>{selectedPatient.age} yrs</span>}
                      {selectedPatient.gender && <span>• {selectedPatient.gender}</span>}
                      <span>• Registered {formatRelativeDate(selectedPatient.created_at)}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-sm font-medium text-surface-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                >
                  Change
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── New Patient Form ────────────────────────────────────────── */}
        {isNewPatient && !selectedPatient && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <Card title="New Patient" icon={<UserPlus className="w-5 h-5" />}>
              <div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs font-medium text-surface-500 hover:text-red-600 transition-colors"
                >
                  ← Back to Search
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Full Name"
                  name="patient_name"
                  value={formData.patient_name}
                  onChange={handleInputChange}
                  placeholder="e.g., John Doe"
                  required
                  error={errors.patient_name}
                  disabled={isLoading}
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Age"
                    name="patient_age"
                    type="number"
                    value={formData.patient_age}
                    onChange={handleInputChange}
                    placeholder="Years"
                    error={errors.patient_age}
                    disabled={isLoading}
                  />
                  <SelectField
                    label="Gender"
                    name="patient_gender"
                    value={formData.patient_gender}
                    onChange={handleInputChange}
                    options={[
                      { value: 'M', label: 'Male' },
                      { value: 'F', label: 'Female' },
                      { value: 'O', label: 'Other' }
                    ]}
                    error={errors.patient_gender}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── Previous Records (shown when existing patient is selected) */}
        {selectedPatient && caseHistory && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="!p-0 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between px-5 py-4 bg-surface-50/80 hover:bg-surface-100/80 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-surface-900">Previous Records</h3>
                  <Badge variant="neutral">{caseHistory.total_cases} case{caseHistory.total_cases !== 1 ? 's' : ''}</Badge>
                </div>
                {showHistory ? <ChevronUp className="w-5 h-5 text-surface-400" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    {historyLoading ? (
                      <div className="p-8 flex justify-center">
                        <LoadingSpinner text="Loading patient history..." />
                      </div>
                    ) : caseHistory.cases.length === 0 ? (
                      <div className="p-6 text-center">
                        <FileText className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                        <p className="text-sm text-surface-500">No previous cases found for this patient.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-surface-100">
                        {caseHistory.cases.map((c: any) => (
                          <div
                            key={c.id}
                            className="px-5 py-4 hover:bg-surface-50/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/cases/${c.id}`)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0 mr-4">
                                <p className="font-semibold text-surface-800 text-sm">
                                  {c.chief_complaint || 'No complaint noted'}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={c.status === 'CLOSED' ? 'success' : c.status === 'DRAFT' ? 'neutral' : 'primary'}>
                                    {formatCaseStatus(c.status)}
                                  </Badge>
                                  <span className="text-xs text-surface-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatRelativeDate(c.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Remedies prescribed */}
                            {c.decisions && c.decisions.length > 0 && (
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Pill className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                {c.decisions.map((d: any) => (
                                  <span key={d.id} className="inline-flex items-center px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-medium text-emerald-700">
                                    {d.remedy_name} {d.potency && <span className="text-emerald-500 ml-1">{d.potency}</span>}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Latest follow-up */}
                            {c.follow_ups && c.follow_ups.length > 0 && (
                              <div className="mt-2 p-2.5 bg-surface-50 rounded-lg border border-surface-100">
                                <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Latest Follow-up</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant={c.follow_ups[0].reaction === 'improvement' ? 'success' : c.follow_ups[0].reaction === 'aggravation' ? 'danger' : 'neutral'}>
                                    {c.follow_ups[0].reaction || 'unknown'}
                                  </Badge>
                                  {c.follow_ups[0].observations && (
                                    <span className="text-xs text-surface-600 truncate">{c.follow_ups[0].observations}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}

        {/* ─── Clinical Information ────────────────────────────────────── */}
        {(selectedPatient || isNewPatient) && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card title="Clinical Information" icon={<Activity className="w-5 h-5" />}>
              <InputField
                label="Chief Complaint"
                name="chief_complaint"
                value={formData.chief_complaint}
                onChange={handleInputChange}
                placeholder="Primary reason for consultation"
                required
                error={errors.chief_complaint}
                disabled={isLoading}
              />
              <TextAreaField
                label="Detailed Case Notes"
                name="case_notes"
                value={formData.case_notes}
                onChange={handleInputChange}
                placeholder="Record etiology, modalities, concomitants, physical generals, and mentals..."
                rows={6}
                disabled={isLoading}
              />
            </Card>
          </motion.div>
        )}

        {/* ─── Submit ──────────────────────────────────────────────────── */}
        {(selectedPatient || isNewPatient) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="flex gap-4 pt-4">
              <Button type="button" variant="secondary" onClick={() => navigate('/cases')} disabled={isLoading} className="w-32">
                Cancel
              </Button>
              <Button type="submit" loading={isLoading} className="flex-1 shadow-glow">
                Create Case Record
              </Button>
            </div>
          </motion.div>
        )}
      </form>
    </Container>
  );
};

export default CreateCasePage;
