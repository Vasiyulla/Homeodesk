import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/store';
import { appointmentApi, type Appointment } from '../services/appointmentApi';
import { patientApi } from '../services/patientApi';
import Container from '../components/Container';
import Card from '../components/Card';
import Button from '../components/Button';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import type { Patient, Invoice } from '../types';
import { Calendar, Users, ClipboardList, Plus, Clock, Activity, X, AlertCircle, Receipt, IndianRupee } from 'lucide-react';
import { billingApi } from '../services/billingApi';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../services/apiClient';

import { useWebSocket } from '../hooks/useWebSocket';
import { useNotification } from '../hooks/useNotification';
import LiveIndicator from '../components/LiveIndicator';

const AssistantDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Vitals state
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [isEmergencyVitals, setIsEmergencyVitals] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ name: '', age: '', gender: '' });
  const [vitalsPatientId, setVitalsPatientId] = useState('');
  const [vitals, setVitals] = useState({
    height: '', weight: '', blood_pressure: '', temperature: '', pulse: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Billing state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoicePatientId, setInvoicePatientId] = useState('');
  const [invoiceItems, setInvoiceItems] = useState([{ description: '', amount: '' }]);

  const fetchData = async () => {
    try {
      const [apptsRes, patientsRes, invoicesRes] = await Promise.all([
        apiClient.get('/appointments'),
        patientApi.list(),
        billingApi.listInvoices()
      ]);
      setAppointments(apptsRes.data);
      if (patientsRes.success && patientsRes.data) {
        setPatients(patientsRes.data);
      }
      if (invoicesRes.success && invoicesRes.data) {
        setInvoices(invoicesRes.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { success, info, error: notifyError } = useNotification();

  const { isConnected } = useWebSocket('waiting-room', (msg) => {
    if (msg.event === 'patient_checked_in') {
      info('Patient Arrived', 'A patient has been checked in to the waiting room');
      fetchData();
    }
  });

  const { isConnected: isBillingConnected } = useWebSocket('billing', (msg) => {
    if (msg.event === 'invoice_created' || msg.event === 'invoice_paid') {
      fetchData();
    }
  });

  const handleCheckIn = async (appointmentId: string) => {
    const res = await appointmentApi.checkIn(appointmentId);
    if (res.success) {
      fetchData();
      success('Checked In', 'Patient has been moved to the waiting room');
    } else {
      notifyError('Check-in Failed', 'Could not check in the patient. Please try again.');
    }
  };

  const handleOpenVitalsModal = (patientId?: string) => {
    if (patientId) {
      setIsEmergencyVitals(false);
      setIsNewPatient(false);
      setVitalsPatientId(patientId);
    } else {
      setIsEmergencyVitals(true);
      setIsNewPatient(false);
      setVitalsPatientId('');
    }
    setNewPatientData({ name: '', age: '', gender: '' });
    setVitals({ height: '', weight: '', blood_pressure: '', temperature: '', pulse: '' });
    setShowVitalsModal(true);
  };

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEmergencyVitals && isNewPatient && !newPatientData.name) {
      notifyError('Missing Information', 'Please provide at least a patient name.');
      return;
    }

    if (!isNewPatient && !vitalsPatientId) {
      notifyError('Missing Patient', 'Please select a patient first.');
      return;
    }
    
    setIsSubmitting(true);
    let targetPatientId = vitalsPatientId;

    if (isNewPatient) {
      const patientRes = await patientApi.create({
        name: newPatientData.name,
        age: newPatientData.age ? parseInt(newPatientData.age) : undefined,
        gender: newPatientData.gender || undefined
      });
      if (patientRes.success && patientRes.data) {
        targetPatientId = patientRes.data.id;
      } else {
        notifyError('Registration Failed', 'Could not register new patient.');
        setIsSubmitting(false);
        return;
      }
    }
    const vitalsData = {
      ...(vitals.height && { height: parseFloat(vitals.height) }),
      ...(vitals.weight && { weight: parseFloat(vitals.weight) }),
      ...(vitals.blood_pressure && { blood_pressure: vitals.blood_pressure }),
      ...(vitals.temperature && { temperature: parseFloat(vitals.temperature) }),
      ...(vitals.pulse && { pulse: parseInt(vitals.pulse) }),
    };
    const res = await patientApi.addVitals(targetPatientId, vitalsData);
    
    if (res.success) {
      // Check if patient already has an active appointment in waiting room
      const existingAppt = appointments.find(a => a.patient_id === targetPatientId && a.status === 'ARRIVED');
      if (!existingAppt) {
        // Automatically create a walk-in appointment and check them in
        const apptRes = await appointmentApi.create({
          patient_id: targetPatientId,
          scheduled_time: new Date().toISOString()
        });
        if (apptRes.success && apptRes.data) {
          await appointmentApi.checkIn(apptRes.data.id);
        }
      }
      setShowVitalsModal(false);
      success('Vitals Saved', 'Patient sent to Doctor Waiting Room.');
      fetchData(); 
    } else {
      notifyError('Save Failed', 'Could not save vitals. Please try again.');
    }
    setIsSubmitting(false);
  };

  const handleQuickAddItem = (desc: string, amt: string) => {
    const newItems = [...invoiceItems];
    if (newItems.length === 1 && !newItems[0].description && !newItems[0].amount) {
      newItems[0] = { description: desc, amount: amt };
    } else {
      newItems.push({ description: desc, amount: amt });
    }
    setInvoiceItems(newItems);
  };

  const handleCreateInvoice = async () => {
    if (!invoicePatientId) {
      notifyError('Missing Patient', 'Please select a patient');
      return;
    }
    const validItems = invoiceItems.filter(item => item.description && item.amount);
    if (validItems.length === 0) {
      notifyError('Missing Items', 'Please add at least one item');
      return;
    }
    const formattedItems = validItems.map(item => ({
      description: item.description,
      amount: parseFloat(item.amount)
    }));

    setIsSubmitting(true);
    const res = await billingApi.createInvoice({
      patient_id: invoicePatientId,
      items: formattedItems
    });
    setIsSubmitting(false);

    if (res.success) {
      success('Invoice Created', 'The invoice has been successfully created.');
      setShowInvoiceModal(false);
      setInvoicePatientId('');
      setInvoiceItems([{ description: '', amount: '' }]);
      fetchData();
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    const res = await billingApi.payInvoice(invoiceId, 'CASH');
    if (res.success) {
      success('Payment Recorded', 'Invoice marked as paid.');
      fetchData();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Calculate waiting room count
  const waitingRoomCount = appointments.filter(a => a.status === 'ARRIVED').length;
  
  // Filter out completed and cancelled appointments
  const activeAppointments = appointments.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED');

  return (
    <Container className="pt-6">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="bg-gradient-to-r from-teal-600 to-teal-800 p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <ClipboardList className="w-8 h-8" /> 
              Front Desk / Assistant
            </h1>
            <p className="text-teal-100 max-w-xl">
              Manage patient intake, schedule appointments, and control the waiting room queue.
            </p>
          </div>
          <div className="relative z-10 mt-6 flex gap-3">
             <Button className="bg-white text-teal-800 hover:bg-teal-50 shadow-glow" icon={<Plus className="w-4 h-4" />} onClick={() => window.location.href = '/patients'}>
              Patient Intake
             </Button>
             <Button className="bg-rose-500 text-white hover:bg-rose-600 border-none shadow-glow-sm" icon={<AlertCircle className="w-4 h-4" />} onClick={() => handleOpenVitalsModal()}>
              Emergency Vitals
             </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex items-center gap-5 border-l-4 border-l-teal-500">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500 uppercase">Today's Appointments</p>
              <h3 className="text-3xl font-bold text-surface-900">{activeAppointments.length}</h3>
            </div>
          </Card>
          <Card className="flex items-center gap-5 border-l-4 border-l-amber-500">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500 uppercase">Waiting Room</p>
              <h3 className="text-3xl font-bold text-surface-900">{waitingRoomCount}</h3>
            </div>
          </Card>
        </motion.div>

        {/* Appointments List */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-surface-900">Upcoming Appointments</h2>
              <LiveIndicator isConnected={isConnected} />
            </div>
          </div>

          <Card className="p-0 overflow-hidden">
             {isLoading ? (
                <div className="p-8 text-center text-surface-500">Loading schedule...</div>
             ) : activeAppointments.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-4 text-surface-400">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-surface-900">No Appointments</h3>
                  <p className="text-surface-500">There are no appointments scheduled for today.</p>
                </div>
             ) : (
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-surface-50 border-b border-surface-100">
                     <th className="p-4 font-semibold text-surface-600">Time</th>
                     <th className="p-4 font-semibold text-surface-600">Patient</th>
                     <th className="p-4 font-semibold text-surface-600">Status</th>
                     <th className="p-4 font-semibold text-surface-600 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {activeAppointments.map((appt) => (
                     <tr key={appt.id} className="border-b border-surface-100 hover:bg-surface-50">
                       <td className="p-4 font-medium text-surface-900">
                         <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-surface-400"/> {new Date(appt.scheduled_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                       </td>
                       <td className="p-4 font-medium">{patients.find(p => p.id === appt.patient_id)?.name || 'Unknown Patient'}</td>
                       <td className="p-4">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                           appt.status === 'ARRIVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                         }`}>
                           {appt.status}
                         </span>
                       </td>
                       <td className="p-4 text-right">
                          {appt.status !== 'ARRIVED' ? (
                            <Button variant="secondary" size="sm" onClick={() => handleCheckIn(appt.id)}>Check In</Button>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => handleOpenVitalsModal(appt.patient_id)} className="text-brand-600 border-brand-200 bg-brand-50 hover:bg-brand-100">
                              <Activity className="w-4 h-4 mr-1.5" /> Record Vitals
                            </Button>
                          )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
          </Card>
        </motion.div>
      </motion.div>

      {/* Billing Widget */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-surface-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-brand-500" /> Recent Invoices
          </h2>
          <Button size="sm" onClick={() => setShowInvoiceModal(true)} icon={<Plus className="w-4 h-4" />}>New Invoice</Button>
        </div>
        <Card noPadding className="overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-surface-500">
              <Receipt className="w-12 h-12 text-surface-200 mx-auto mb-3" />
              <p>No invoices created yet.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-100">
                  <th className="p-4 font-semibold text-surface-600">Date</th>
                  <th className="p-4 font-semibold text-surface-600">Patient</th>
                  <th className="p-4 font-semibold text-surface-600">Amount</th>
                  <th className="p-4 font-semibold text-surface-600">Status</th>
                  <th className="p-4 font-semibold text-surface-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="p-4 text-surface-500">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-medium text-surface-900">
                      {patients.find(p => p.id === inv.patient_id)?.name || 'Unknown'}
                    </td>
                    <td className="p-4 font-medium text-surface-900">
                      ₹{inv.amount_due.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {inv.status === 'PENDING' && (
                        <Button variant="secondary" size="sm" onClick={() => handlePayInvoice(inv.id)} className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">
                          Mark as Paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </motion.div>

      {/* Vitals Modal */}
      <AnimatePresence>
        {showVitalsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-surface-100 bg-surface-50/50">
                <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-500" /> {isEmergencyVitals ? 'Emergency Vitals' : 'Record Vitals'}
                </h2>
                <button onClick={() => setShowVitalsModal(false)} className="p-1 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleSaveVitals} className="space-y-4">
                  {isEmergencyVitals && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-surface-700">Patient Selection</label>
                        <button
                          type="button"
                          onClick={() => setIsNewPatient(!isNewPatient)}
                          className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
                        >
                          {isNewPatient ? 'Select Existing Patient' : '+ Register New Patient'}
                        </button>
                      </div>

                      {isNewPatient ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface-50 rounded-xl border border-surface-100">
                          <div className="md:col-span-2">
                            <InputField
                              label="Full Name"
                              placeholder="John Doe"
                              value={newPatientData.name}
                              onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}
                              required
                            />
                          </div>
                          <InputField
                            label="Age"
                            type="number"
                            placeholder="e.g. 30"
                            value={newPatientData.age}
                            onChange={(e) => setNewPatientData({ ...newPatientData, age: e.target.value })}
                          />
                          <SelectField
                            label="Gender"
                            value={newPatientData.gender}
                            onChange={(e) => setNewPatientData({ ...newPatientData, gender: e.target.value })}
                            options={[
                              { value: 'Male', label: 'Male' },
                              { value: 'Female', label: 'Female' },
                              { value: 'Other', label: 'Other' }
                            ]}
                          />
                        </div>
                      ) : (
                        <SelectField
                          label="Select Patient"
                          value={vitalsPatientId}
                          onChange={(e) => setVitalsPatientId(e.target.value)}
                          options={patients.map(p => ({ value: p.id, label: p.display_id ? `${p.name} (${p.display_id})` : p.name }))}
                          required={!isNewPatient}
                        />
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Blood Pressure" placeholder="120/80" value={vitals.blood_pressure} onChange={(e) => setVitals({ ...vitals, blood_pressure: e.target.value })} />
                    <InputField label="Pulse (bpm)" type="number" placeholder="72" value={vitals.pulse} onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })} />
                    <InputField label="Temperature (F)" type="number" step="0.1" placeholder="98.6" value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })} />
                    <InputField label="Weight (kg)" type="number" step="0.1" placeholder="70.5" value={vitals.weight} onChange={(e) => setVitals({ ...vitals, weight: e.target.value })} />
                  </div>
                  <div className="pt-4 flex justify-end gap-3 border-t border-surface-100 mt-6">
                    <Button type="button" variant="ghost" onClick={() => setShowVitalsModal(false)}>Cancel</Button>
                    <Button type="submit" loading={isSubmitting}>Save Vitals</Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Invoice Modal */}
      <AnimatePresence>
        {showInvoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-surface-100 bg-surface-50/50">
                <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-brand-500" /> Create Invoice
                </h2>
                <button onClick={() => setShowInvoiceModal(false)} className="p-1 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={(e) => { e.preventDefault(); handleCreateInvoice(); }} className="space-y-4">
                  <SelectField
                    label="Select Patient"
                    value={invoicePatientId}
                    onChange={(e) => setInvoicePatientId(e.target.value)}
                    options={patients.map(p => ({ value: p.id, label: p.display_id ? `${p.name} (${p.display_id})` : p.name }))}
                    required
                  />
                  
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-surface-700">Line Items</label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setInvoiceItems([...invoiceItems, { description: '', amount: '' }])}>
                        <Plus className="w-4 h-4 mr-1" /> Add Custom Item
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                       <button type="button" onClick={() => handleQuickAddItem('New Case Registration', '100')} className="px-3 py-1.5 bg-surface-100 text-surface-700 text-xs rounded-full hover:bg-brand-50 hover:text-brand-700 transition-colors border border-surface-200">+ Registration (₹100)</button>
                       <button type="button" onClick={() => handleQuickAddItem('Consultation Fee', '300')} className="px-3 py-1.5 bg-surface-100 text-surface-700 text-xs rounded-full hover:bg-brand-50 hover:text-brand-700 transition-colors border border-surface-200">+ Consultation (₹300)</button>
                       <button type="button" onClick={() => handleQuickAddItem('Injection / Procedure', '150')} className="px-3 py-1.5 bg-surface-100 text-surface-700 text-xs rounded-full hover:bg-brand-50 hover:text-brand-700 transition-colors border border-surface-200">+ Injection (₹150)</button>
                       <button type="button" onClick={() => handleQuickAddItem('Medicine (1 Week)', '200')} className="px-3 py-1.5 bg-surface-100 text-surface-700 text-xs rounded-full hover:bg-brand-50 hover:text-brand-700 transition-colors border border-surface-200">+ Medicine (1W: ₹200)</button>
                       <button type="button" onClick={() => handleQuickAddItem('Medicine (1 Month)', '600')} className="px-3 py-1.5 bg-surface-100 text-surface-700 text-xs rounded-full hover:bg-brand-50 hover:text-brand-700 transition-colors border border-surface-200">+ Medicine (1M: ₹600)</button>
                    </div>

                    <div className="space-y-3">
                      {invoiceItems.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-start">
                          <div className="flex-1">
                            <InputField 
                              placeholder="Description (e.g. Consultation)" 
                              value={item.description} 
                              onChange={(e) => {
                                const newItems = [...invoiceItems];
                                newItems[idx].description = e.target.value;
                                setInvoiceItems(newItems);
                              }} 
                              required 
                            />
                          </div>
                          <div className="w-32">
                            <InputField 
                              type="number" 
                              placeholder="Amount" 
                              value={item.amount} 
                              onChange={(e) => {
                                const newItems = [...invoiceItems];
                                newItems[idx].amount = e.target.value;
                                setInvoiceItems(newItems);
                              }} 
                              required 
                              min="0"
                              step="0.01"
                            />
                          </div>
                          {invoiceItems.length > 1 && (
                            <button type="button" onClick={() => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx))} className="mt-2.5 p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between items-center border-t border-surface-100 mt-6">
                    <div className="text-surface-700">
                      Total: <span className="text-xl font-bold text-surface-900">₹{invoiceItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex gap-3">
                      <Button type="button" variant="ghost" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
                      <Button type="submit" loading={isSubmitting}>Create Invoice</Button>
                    </div>
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

export default AssistantDashboardPage;
