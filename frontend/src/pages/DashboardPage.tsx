import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useCaseStore } from '../store/store';
import { caseApi } from '../services/caseApi';
import { appointmentApi, type Appointment } from '../services/appointmentApi';
import { patientApi } from '../services/patientApi';
import type { Patient } from '../types';
import { formatRelativeDate } from '../utils/dateFormatter';
import { format, parseISO } from 'date-fns';
import Container from '../components/Container';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { Users, Activity, Plus, ArrowRight, Search, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardPageProps {
  title?: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ title }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { cases, setCases, isLoading, setLoading, error, setError } = useCaseStore();
  const [waitingPatients, setWaitingPatients] = useState<Appointment[]>([]);
  const [patientsDict, setPatientsDict] = useState<Record<string, Patient>>({});
  const [isWaitingLoading, setIsWaitingLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      setIsWaitingLoading(true);
      
      try {
        const [casesResult, apptsResult, patientsResult] = await Promise.all([
          caseApi.listMyCases(),
          appointmentApi.list(),
          patientApi.list()
        ]);
        
        if (casesResult.success && casesResult.data) {
          setCases(casesResult.data);
        }
        
        if (patientsResult.success && patientsResult.data) {
          const dict: Record<string, Patient> = {};
          patientsResult.data.forEach(p => { dict[p.id] = p; });
          setPatientsDict(dict);
        }
        
        if (apptsResult.success && apptsResult.data) {
          // Filter for patients currently in waiting room today
          const arrived = apptsResult.data.filter(a => a.status === 'ARRIVED');
          setWaitingPatients(arrived);
        }
      } catch (err: any) {
        setError({ status: 500, message: 'Failed to load dashboard data', errors: null });
      } finally {
        setLoading(false);
        setIsWaitingLoading(false);
      }
    };

    fetchDashboardData();
  }, [setCases, setLoading, setError]);

  const recentCases = cases.slice(0, 4);
  const activeCasesCount = cases.length;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <Container className="pt-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Welcome Hero */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 bg-white/60 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-white shadow-glass-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 hidden md:block" />
          <div className="relative z-10 w-full">
            <h1 className="text-2xl md:text-3xl font-bold text-surface-900 mb-2">
              {title ? title : <>Welcome back, <span className="text-brand-600">{user?.full_name || 'Doctor'}</span></>}
            </h1>
            <p className="text-sm md:text-base text-surface-600 max-w-xl hidden md:block">
              You have {activeCasesCount} total cases in your workspace. Start a new case or continue working on an existing one.
            </p>
          </div>
          <div className="relative z-10 flex flex-row w-full md:w-auto gap-3">
            <Button className="flex-1 md:flex-none shadow-glow" onClick={() => navigate('/cases/new')} icon={<Plus className="w-4 h-4" />}>
              New Case
            </Button>
            <Button className="flex-1 md:flex-none" variant="secondary" onClick={() => navigate('/symptoms')} icon={<Search className="w-4 h-4" />}>
              Search
            </Button>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          <Card className="!p-4 md:!p-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 border-l-4 border-l-brand-500">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
              <Users className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div>
              <p className="text-[10px] md:text-sm font-medium text-surface-500 uppercase tracking-wider mb-0.5 md:mb-1">Total Cases</p>
              <h3 className="text-2xl md:text-3xl font-bold text-surface-900">{activeCasesCount}</h3>
            </div>
          </Card>
          
          <Card className="!p-4 md:!p-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 border-l-4 border-l-emerald-500">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <MapPin className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div>
              <p className="text-[10px] md:text-sm font-medium text-surface-500 uppercase tracking-wider mb-0.5 md:mb-1">Waiting Room</p>
              <h3 className="text-2xl md:text-3xl font-bold text-surface-900">{waitingPatients.length}</h3>
            </div>
          </Card>

          <Card className="!p-4 md:!p-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-white col-span-2 md:col-span-1">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div>
              <p className="text-[10px] md:text-sm font-medium text-surface-600 uppercase tracking-wider mb-0.5 md:mb-1">Pending Review</p>
              <h3 className="text-2xl md:text-3xl font-bold text-surface-900">2</h3>
            </div>
          </Card>
        </motion.div>

        {/* Two Column Layout for Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column: Live Waiting Room */}
          <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-surface-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" /> Live Waiting Room
              </h2>
            </div>
            
            {isWaitingLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-20 animate-pulse bg-surface-100 rounded-xl" />)}
              </div>
            ) : waitingPatients.length === 0 ? (
              <Card className="text-center py-10 bg-emerald-50/50 border-dashed border-emerald-100">
                <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-emerald-900">Waiting Room is Empty</h3>
                <p className="text-xs text-emerald-700 mt-1">No patients are currently checked in.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {waitingPatients.map((appt: Appointment) => {
                    const patient = patientsDict[appt.patient_id];
                    return (
                      <motion.div
                        key={appt.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                        <div className="flex justify-between items-start pl-2">
                          <div>
                            <h4 className="font-bold text-surface-900">{patient?.name || 'Unknown Patient'}</h4>
                            <p className="text-xs text-surface-500 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Checked in at {format(parseISO(appt.scheduled_time), 'h:mm a')}
                            </p>
                          </div>
                          <Badge variant="success">Waiting</Badge>
                        </div>
                        <div className="mt-4 pt-3 border-t border-surface-100 pl-2">
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => {
                              // If they have a case, open it. Otherwise, create one.
                              const existingCase = cases.find(c => c.patient_id === appt.patient_id);
                              if (existingCase) {
                                navigate(`/cases/${existingCase.id}`);
                              } else {
                                navigate(`/cases/new`);
                              }
                            }}
                          >
                            Start Consultation
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
          
          {/* Right Column: Recent Cases */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-surface-900">Recent Cases</h2>
            <Button variant="ghost" onClick={() => navigate('/cases')} className="text-sm">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 glass-card animate-pulse bg-surface-100" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100">
              Failed to load recent cases. {error.message}
            </div>
          ) : recentCases.length === 0 ? (
            <Card className="text-center py-16 bg-surface-50/50 border-dashed border-2">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Users className="w-8 h-8 text-surface-300" />
              </div>
              <h3 className="text-lg font-medium text-surface-900 mb-2">No cases yet</h3>
              <p className="text-surface-500 mb-6 max-w-md mx-auto">Your workspace is empty. Create your first patient case to begin.</p>
              <Button onClick={() => navigate('/cases/new')}>Create First Case</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {recentCases.map(c => (
                <Card 
                  key={c.id} 
                  interactive 
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="flex flex-col h-full hover:border-brand-300 transition-colors p-5 group"
                >
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-surface-100 to-surface-200 flex items-center justify-center font-bold text-surface-600 border border-white shadow-sm">
                      {c.patient_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="shrink-0 max-w-[50%] overflow-hidden">
                      <Badge variant={c.mode === 'dynamic' ? 'primary' : 'warning'}>
                        <span className="truncate block">{c.mode}</span>
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-surface-900 text-lg truncate mb-1">
                      {c.patient_name || 'Unnamed Patient'}
                    </h3>
                    <p className="text-sm text-surface-500 line-clamp-2 mb-4">
                      {c.chief_complaint || 'No complaint specified'}
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-surface-100 mt-auto flex items-center justify-between text-xs text-surface-400 font-medium">
                    <span className="flex items-center gap-1.5 truncate mr-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{formatRelativeDate(c.updated_at || c.created_at)}</span>
                    </span>
                    <span className="text-brand-600 font-semibold group-hover:translate-x-1 transition-transform shrink-0 whitespace-nowrap">
                      Open &rarr;
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
          </motion.div>
        </div>
      </motion.div>
    </Container>
  );
};

export default DashboardPage;
