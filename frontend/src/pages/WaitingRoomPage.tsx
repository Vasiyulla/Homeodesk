import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentApi, type Appointment } from '../services/appointmentApi';
import { patientApi } from '../services/patientApi';
import type { Patient } from '../types';
import Container from '../components/Container';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { Users, Clock, Video, UserCheck, Stethoscope, PhoneCall, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const WaitingRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  
  // Refresh clock for wait times
  const [, setTick] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [apptsRes, patientsRes] = await Promise.all([
        appointmentApi.getWaitingRoom(),
        patientApi.list(),
      ]);

      if (apptsRes.success && apptsRes.data) {
        setAppointments(apptsRes.data);
      } else {
        setError(apptsRes.error);
      }
      
      if (patientsRes.success && patientsRes.data) {
        setPatients(patientsRes.data);
      }
    } catch (err) {
      setError({ message: 'Failed to load waiting room.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    // Poll every 10 seconds as a fallback to websockets
    const pollInterval = setInterval(loadData, 10000);
    
    // Tick every minute to update wait time strings
    const tickInterval = setInterval(() => setTick(t => t + 1), 60000);
    
    return () => {
      clearInterval(pollInterval);
      clearInterval(tickInterval);
    };
  }, [loadData]);

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.name || 'Unknown Patient';

  const inPersonCount = appointments.filter(a => a.appointment_type !== 'telemedicine').length;
  const teleCount = appointments.filter(a => a.appointment_type === 'telemedicine').length;

  return (
    <Container className="py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-brand-600" /> Live Waiting Room
          </h1>
          <p className="text-surface-500 mt-1">Patients currently checked-in and waiting for consultation.</p>
        </div>
        
        <div className="flex gap-4">
          <Card className="px-4 py-2 flex items-center gap-3 !rounded-full shadow-sm bg-blue-50/50 border-blue-100">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <div className="text-sm font-semibold text-blue-900">
              {inPersonCount} <span className="font-normal text-blue-700">In-Clinic</span>
            </div>
          </Card>
          <Card className="px-4 py-2 flex items-center gap-3 !rounded-full shadow-sm bg-purple-50/50 border-purple-100">
            <Video className="w-5 h-5 text-purple-600" />
            <div className="text-sm font-semibold text-purple-900">
              {teleCount} <span className="font-normal text-purple-700">Online</span>
            </div>
          </Card>
        </div>
      </div>

      {error && <ErrorAlert error={error} onClose={() => setError(null)} className="mb-6" />}

      {isLoading && appointments.length === 0 ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="Loading waiting room..." />
        </div>
      ) : appointments.length === 0 ? (
        <Card className="text-center py-20 bg-surface-50/50 border-dashed">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-brand-500" />
          </div>
          <h3 className="text-xl font-bold text-surface-900 mb-2">Waiting Room is Empty</h3>
          <p className="text-surface-500 max-w-sm mx-auto">
            There are no patients currently checked in. Take a break or review upcoming appointments!
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {appointments.map((appt, idx) => {
              const isTele = appt.appointment_type === 'telemedicine';
              const waitTime = appt.checked_in_at 
                ? formatDistanceToNow(parseISO(appt.checked_in_at))
                : 'just now';
                
              return (
                <motion.div 
                  key={appt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden flex flex-col sm:flex-row hover:shadow-md transition-shadow"
                >
                  <div className={`w-2 h-auto shrink-0 ${isTele ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                  
                  <div className="flex-1 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                        isTele ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {isTele ? <Video className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-surface-900">
                            {getPatientName(appt.patient_id)}
                          </h3>
                          {appt.is_emergency && (
                            <Badge variant="danger" className="animate-pulse">Emergency</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-surface-600 font-medium">
                          <span className="flex items-center gap-1.5 text-amber-600">
                            <Clock className="w-4 h-4" /> Waiting for {waitTime}
                          </span>
                          <span className="text-surface-300">|</span>
                          <span className="flex items-center gap-1.5">
                            {isTele ? 'Telemedicine Call' : 'In-Person Visit'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:items-end gap-3 sm:gap-2">
                      {isTele ? (
                        <a 
                          href={appt.meeting_link || '#'} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm shadow-purple-200 transition-colors"
                        >
                          <PhoneCall className="w-4 h-4" /> Start Video Call
                        </a>
                      ) : (
                        <Button 
                          onClick={() => navigate(`/cases/new?patientId=${appt.patient_id}`)}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200"
                        >
                          <Stethoscope className="w-4 h-4 mr-2" /> Start Consultation
                        </Button>
                      )}
                      
                      <button 
                        onClick={() => appointmentApi.complete(appt.id).then(loadData)}
                        className="text-xs font-semibold text-surface-400 hover:text-surface-600 px-2 py-1"
                      >
                        Mark as Completed (Skip)
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </Container>
  );
};

export default WaitingRoomPage;
