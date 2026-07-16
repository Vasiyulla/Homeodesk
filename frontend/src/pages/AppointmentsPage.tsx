import React, { useEffect, useState, useCallback } from 'react';
import { appointmentApi, type Appointment } from '../services/appointmentApi';
import { patientApi } from '../services/patientApi';
import { staffApi, type StaffMember } from '../services/staffApi';
import type { Patient } from '../types';
import Container from '../components/Container';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Calendar as CalendarIcon, Clock, User, UserCheck, Plus, MapPin, CheckCircle2, Activity, X } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO, compareAsc } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<StaffMember[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  
  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [appointmentType, setAppointmentType] = useState('in_person');

  // Vitals Modal State
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsPatientId, setVitalsPatientId] = useState('');
  const [vitalsPatientName, setVitalsPatientName] = useState('');
  
  const [vitals, setVitals] = useState({
    height: '',
    weight: '',
    blood_pressure: '',
    temperature: '',
    pulse: '',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [apptsRes, patientsRes, staffRes] = await Promise.all([
        appointmentApi.list(),
        patientApi.list(),
        staffApi.getStaff(),
      ]);

      if (apptsRes.success && apptsRes.data) {
        setAppointments(apptsRes.data);
      }
      
      if (patientsRes.success && patientsRes.data) {
        setPatients(patientsRes.data);
      }
      
      if (staffRes.success && staffRes.data) {
        setDoctors(staffRes.data.filter(s => s.role === 'DOCTOR' || s.role === 'OWNER'));
      }
    } catch (err) {
      setError({ message: 'Failed to load data.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDate || !selectedTime) {
      setError({ message: 'Please fill in all required fields.' });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    // Combine date and time to ISO string
    const dateTime = new Date(`${selectedDate}T${selectedTime}`);
    const isTelemedicine = appointmentType === 'telemedicine';
    
    const result = await appointmentApi.create({
      patient_id: selectedPatientId,
      doctor_id: selectedDoctorId || undefined,
      scheduled_time: dateTime.toISOString(),
      appointment_type: appointmentType,
      meeting_link: isTelemedicine ? `https://meet.homeocare.com/${Math.random().toString(36).substring(7)}` : undefined,
    });

    if (result.success && result.data) {
      setAppointments([...appointments, result.data]);
      setSelectedPatientId('');
      setSelectedDoctorId('');
      setSelectedDate('');
      setSelectedTime('');
    } else {
      setError(result.error);
    }
    
    setIsSubmitting(false);
  };

  const handleCheckIn = async (id: string) => {
    const result = await appointmentApi.checkIn(id);
    if (result.success && result.data) {
      setAppointments(prev => prev.map(a => a.id === id ? result.data! : a));
    }
  };

  const handleOpenVitalsModal = (patientId: string, patientName: string) => {
    setVitalsPatientId(patientId);
    setVitalsPatientName(patientName);
    setVitals({
      height: '',
      weight: '',
      blood_pressure: '',
      temperature: '',
      pulse: '',
    });
    setShowVitalsModal(true);
  };

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      height: vitals.height ? parseFloat(vitals.height) : undefined,
      weight: vitals.weight ? parseFloat(vitals.weight) : undefined,
      blood_pressure: vitals.blood_pressure || undefined,
      temperature: vitals.temperature ? parseFloat(vitals.temperature) : undefined,
      pulse: vitals.pulse ? parseInt(vitals.pulse, 10) : undefined,
    };
    
    const result = await patientApi.addVitals(vitalsPatientId, payload);
    setIsSubmitting(false);
    
    if (result.success) {
      setShowVitalsModal(false);
      // We don't strictly need to update appointments state for this, but user is notified.
    } else {
      setError(result.error);
    }
  };

  // Group appointments by date
  const groupedAppointments = appointments.reduce((acc, appt) => {
    const dateStr = parseISO(appt.scheduled_time).toISOString().split('T')[0];
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(appt);
    return acc;
  }, {} as Record<string, Appointment[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedAppointments).sort((a, b) => 
    compareAsc(parseISO(a), parseISO(b))
  );

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.name || 'Unknown Patient';
  const getDoctorName = (id: string | null) => doctors.find(d => d.user_id === id)?.full_name || 'Any Available Doctor';

  const formatGroupDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM do');
  };

  return (
    <Container className="py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-brand-600" /> Appointments
          </h1>
          <p className="text-surface-500 mt-1">Manage schedules and patient arrivals.</p>
        </div>
      </div>

      {error && <ErrorAlert error={error} onClose={() => setError(null)} className="mb-6" />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Panel: Agenda View */}
        <div className="lg:col-span-2 space-y-8">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner text="Loading calendar..." />
            </div>
          ) : sortedDates.length === 0 ? (
            <Card className="text-center py-16 bg-surface-50/50 border-dashed">
              <CalendarIcon className="w-12 h-12 text-surface-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-surface-900 mb-2">No Upcoming Appointments</h3>
              <p className="text-surface-500">The schedule is clear. Book an appointment from the right panel.</p>
            </Card>
          ) : (
            sortedDates.map(dateStr => (
              <div key={dateStr} className="space-y-4">
                <h3 className="text-lg font-bold text-surface-800 flex items-center gap-2 border-b border-surface-200 pb-2">
                  <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                  {formatGroupDate(dateStr)}
                  <span className="text-sm font-normal text-surface-500 ml-2">
                    {format(parseISO(dateStr), 'yyyy-MM-dd')}
                  </span>
                </h3>
                
                <div className="grid gap-3 pl-4 border-l-2 border-brand-100">
                  <AnimatePresence>
                    {groupedAppointments[dateStr]
                      .sort((a, b) => compareAsc(parseISO(a.scheduled_time), parseISO(b.scheduled_time)))
                      .map(appt => (
                      <motion.div 
                        key={appt.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl border ${
                          appt.status === 'ARRIVED' ? 'bg-emerald-50 border-emerald-100' : 
                          appt.status === 'COMPLETED' ? 'bg-surface-50 border-surface-200 opacity-75' :
                          'bg-white border-brand-100 shadow-sm hover:shadow-md'
                        } transition-all`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center justify-center bg-brand-50 text-brand-700 rounded-lg px-3 py-2 min-w-[80px]">
                              <span className="text-lg font-bold leading-tight">
                                {format(parseISO(appt.scheduled_time), 'h:mm')}
                              </span>
                              <span className="text-xs font-semibold uppercase tracking-wider">
                                {format(parseISO(appt.scheduled_time), 'a')}
                              </span>
                            </div>
                            
                            <div>
                              <h4 className="text-lg font-bold text-surface-900 mb-1">{getPatientName(appt.patient_id)}</h4>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-600">
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-4 h-4" /> {getDoctorName(appt.doctor_id)}
                                </span>
                                {appt.status === 'ARRIVED' && (
                                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                    <MapPin className="w-4 h-4" /> Waiting Room
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={
                              appt.status === 'ARRIVED' ? 'success' :
                              appt.status === 'scheduled' ? 'primary' : 'neutral'
                            }>
                              {appt.status.toUpperCase()}
                            </Badge>
                            
                            {appt.status === 'scheduled' && (
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                onClick={() => handleCheckIn(appt.id)}
                                className="!py-1.5"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Check In
                              </Button>
                            )}
                            {appt.status === 'ARRIVED' && (
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                onClick={() => handleOpenVitalsModal(appt.patient_id, getPatientName(appt.patient_id))}
                                className="!py-1.5 text-brand-600 border-brand-200 bg-brand-50 hover:bg-brand-100"
                              >
                                <Activity className="w-4 h-4 mr-1.5" /> Record Vitals
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Panel: Book Form */}
        <div>
          <Card className="sticky top-8 bg-surface-50/30">
            <h2 className="text-xl font-bold text-surface-900 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-600" /> Book Appointment
            </h2>
            
            <form onSubmit={handleBookAppointment} className="space-y-4">
              <SelectField
                label="Select Patient *"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                options={[
                  { value: '', label: '-- Select Patient --' },
                  ...patients.map(p => ({ value: p.id, label: p.name }))
                ]}
                required
              />
              
              <SelectField
                label="Appointment Type"
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
                options={[
                  { value: 'in_person', label: 'In-Person (Clinic)' },
                  { value: 'telemedicine', label: 'Telemedicine (Video Call)' }
                ]}
              />
              
              <SelectField
                label="Assign Doctor (Optional)"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                options={[
                  { value: '', label: 'Any Available Doctor' },
                  ...doctors.map(d => ({ value: d.user_id, label: d.full_name || d.email }))
                ]}
              />
              
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Date *"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  required
                />
                <InputField
                  label="Time *"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  required
                />
              </div>

              <div className="pt-4 mt-6 border-t border-surface-200">
                <Button 
                  type="submit" 
                  className="w-full justify-center shadow-glow" 
                  size="lg"
                  loading={isSubmitting}
                >
                  Confirm Booking
                </Button>
              </div>
            </form>
          </Card>
        </div>
        
      </div>

      {/* Vitals Modal */}
      <AnimatePresence>
        {showVitalsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
                <h3 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-600" />
                  Record Vitals
                </h3>
                <button 
                  onClick={() => setShowVitalsModal(false)}
                  className="text-surface-400 hover:text-surface-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-surface-600 mb-4">
                  Patient: <span className="font-bold text-surface-900">{vitalsPatientName}</span>
                </p>
                <form onSubmit={handleSaveVitals} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Blood Pressure"
                      placeholder="e.g. 120/80"
                      value={vitals.blood_pressure}
                      onChange={(e) => setVitals({ ...vitals, blood_pressure: e.target.value })}
                    />
                    <InputField
                      label="Pulse (bpm)"
                      type="number"
                      placeholder="e.g. 72"
                      value={vitals.pulse}
                      onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                    />
                    <InputField
                      label="Temperature (F)"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 98.6"
                      value={vitals.temperature}
                      onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                    />
                    <InputField
                      label="Weight (kg)"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 70.5"
                      value={vitals.weight}
                      onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                    />
                  </div>
                  
                  <div className="pt-4 flex justify-end gap-3 border-t border-surface-100 mt-6">
                    <Button type="button" variant="ghost" onClick={() => setShowVitalsModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" loading={isSubmitting}>
                      Save Vitals
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Container>
  );
};

export default AppointmentsPage;
