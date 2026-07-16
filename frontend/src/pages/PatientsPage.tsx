import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientApi, type PatientDetail } from '../services/patientApi';
import { appointmentApi } from '../services/appointmentApi';
import { useAuthStore } from '../store/store';
import { useNotification } from '../hooks/useNotification';
import Container from '../components/Container';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatRelativeDate } from '../utils/dateFormatter';
import { motion, AnimatePresence } from 'framer-motion';
import type { Patient } from '../types';
import {
  Search, Plus, User, Calendar, Phone, ArrowRight, X,
  Users as UsersIcon, FileText, ChevronDown, ChevronUp, Activity,
} from 'lucide-react';

const PatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error: notifyError } = useNotification();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add patient form state
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const loadPatients = useCallback(async (q?: string) => {
    setLoading(true);
    const result = await patientApi.list(q);
    if (result.success && result.data) {
      setPatients(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPatients(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, loadPatients]);

  const handleExpandPatient = async (patientId: string) => {
    if (expandedPatient === patientId) {
      setExpandedPatient(null);
      setPatientDetail(null);
      return;
    }
    setExpandedPatient(patientId);
    setDetailLoading(true);
    const result = await patientApi.getById(patientId);
    if (result.success && result.data) {
      setPatientDetail(result.data);
    }
    setDetailLoading(false);
  };

  const handleAddPatient = async () => {
    if (!newName.trim()) return;
    setAddLoading(true);
    const result = await patientApi.create({
      name: newName.trim(),
      age: newAge ? parseInt(newAge) : undefined,
      gender: newGender || undefined,
      contact_info: newPhone ? { phone: newPhone } : undefined,
    });
    if (result.success && result.data) {
      // Automatically check them into the waiting room
      const apptRes = await appointmentApi.create({
        patient_id: result.data.id,
        scheduled_time: new Date().toISOString(),
        is_emergency: isEmergency
      });
      if (apptRes.success && apptRes.data) {
        await appointmentApi.checkIn(apptRes.data.id);
      }

      success('Patient Added', `${newName} has been registered and sent to the waiting room.`);
      setShowAddModal(false);
      setNewName(''); setNewAge(''); setNewGender(''); setNewPhone(''); setIsEmergency(false);
      loadPatients(searchQuery || undefined);
    } else {
      notifyError('Failed to add patient', result.error?.message);
    }
    setAddLoading(false);
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <Container className="pt-6">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 flex items-center gap-3">
              <UsersIcon className="w-8 h-8 text-brand-600" />
              Patients
            </h1>
            <p className="text-surface-500 mt-1">{patients.length} registered patient{patients.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} icon={<Plus className="w-4 h-4" />} className="shadow-glow">
            Add Patient
          </Button>
        </motion.div>

        {/* Search */}
        <motion.div variants={itemVariants}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients by name..."
              className="input-field !pl-12"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-surface-400" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Patient List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" text="Loading patients..." />
          </div>
        ) : patients.length === 0 ? (
          <Card className="text-center py-16 bg-surface-50/50 border-dashed border-2">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <UsersIcon className="w-8 h-8 text-surface-300" />
            </div>
            <h3 className="text-lg font-medium text-surface-900 mb-2">
              {searchQuery ? 'No patients found' : 'No patients yet'}
            </h3>
            <p className="text-surface-500 mb-6 max-w-md mx-auto">
              {searchQuery ? `No patients match "${searchQuery}". Try a different search.` : 'Register your first patient to get started.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddModal(true)}>Add First Patient</Button>
            )}
          </Card>
        ) : (
          <motion.div variants={itemVariants} className="space-y-3">
            {patients.map((patient) => (
              <motion.div key={patient.id} layout>
                <Card
                  className={`!p-0 overflow-hidden cursor-pointer transition-all ${expandedPatient === patient.id ? 'ring-2 ring-brand-300 shadow-lg' : 'hover:shadow-md'}`}
                  onClick={() => handleExpandPatient(patient.id)}
                >
                  <div className="p-5 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-brand-700 font-bold text-lg flex-shrink-0">
                      {patient.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-surface-900 text-lg truncate">
                        {patient.name} {patient.display_id && <span className="text-surface-400 font-normal text-sm ml-2">({patient.display_id})</span>}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-surface-500 mt-0.5">
                        {patient.age && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{patient.age} yrs</span>}
                        {patient.gender && <span>{patient.gender}</span>}
                        {patient.contact_info && (patient.contact_info as any).phone && (
                          <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{(patient.contact_info as any).phone}</span>
                        )}
                      </div>
                    </div>

                    {/* Date + expand */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-surface-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatRelativeDate(patient.created_at)}
                      </span>
                      {expandedPatient === patient.id ? (
                        <ChevronUp className="w-5 h-5 text-brand-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-surface-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Case History */}
                  <AnimatePresence>
                    {expandedPatient === patient.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-5 pb-5 pt-2 border-t border-surface-100">
                          <h4 className="text-sm font-semibold text-surface-600 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Case History
                          </h4>
                          {detailLoading ? (
                            <div className="py-4 text-center">
                              <LoadingSpinner size="sm" text="Loading cases..." />
                            </div>
                          ) : patientDetail && patientDetail.cases.length > 0 ? (
                            <div className="space-y-2">
                              {patientDetail.cases.map((c) => (
                                <div
                                  key={c.id}
                                  onClick={() => navigate(`/cases/${c.id}`)}
                                  className="flex items-center justify-between p-3 rounded-xl bg-surface-50 hover:bg-brand-50 border border-surface-100 hover:border-brand-200 cursor-pointer transition-colors group"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-surface-800 truncate">
                                      {c.chief_complaint || 'No complaint specified'}
                                    </p>
                                    <p className="text-xs text-surface-400 mt-0.5">{formatRelativeDate(c.created_at)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={c.status === 'CLOSED' ? 'success' : c.status === 'DRAFT' ? 'neutral' : 'warning'}>
                                      {c.status}
                                    </Badge>
                                    <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-brand-600 transition-colors" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-surface-400 py-2">No cases recorded for this patient.</p>
                          )}
                          {user?.role !== 'ASSISTANT' && (
                            <div className="mt-3 flex gap-2">
                              <Button
                                variant="secondary"
                                onClick={() => navigate(`/cases/new`, { state: { patientId: patient.id, patientName: patient.name, patientAge: patient.age, patientGender: patient.gender } })}
                                className="text-sm"
                                icon={<Plus className="w-3.5 h-3.5" />}
                              >
                                New Case
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Add Patient Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Patient">
        <div className="space-y-4">
          <InputField
            label="Full Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Patient's full name"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Age"
              type="number"
              value={newAge}
              onChange={(e) => setNewAge(e.target.value)}
              placeholder="Age"
            />
            <SelectField
              label="Gender"
              value={newGender}
              onChange={(e) => setNewGender(e.target.value)}
              options={[
                { value: '', label: 'Select...' },
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>
          <InputField
            label="Phone Number"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="+91 ..."
          />
          <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
            <input
              type="checkbox"
              id="emergency_check"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="w-5 h-5 text-red-600 rounded border-red-300 focus:ring-red-500"
            />
            <label htmlFor="emergency_check" className="text-sm font-bold text-red-700 flex items-center gap-1.5 cursor-pointer">
              <Activity className="w-4 h-4" /> This is an Emergency Walk-in
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddPatient} disabled={!newName.trim() || addLoading}>
              {addLoading ? 'Adding...' : 'Add Patient'}
            </Button>
        </div>
      </Modal>
    </Container>
  );
};

export default PatientsPage;
