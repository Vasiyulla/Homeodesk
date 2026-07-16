import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { pharmacyApi, PrescriptionItem, PharmacyStats } from '../services/pharmacyApi';
import Container from '../components/Container';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import { Pill, CheckCircle2, Clock, User, UserCheck } from 'lucide-react';
import { formatRelativeDate, formatDate } from '../utils/dateFormatter';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorAlert from '../components/ErrorAlert';

const PharmacyPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'dispensed'>('pending');
  const [queue, setQueue] = useState<PrescriptionItem[]>([]);
  const [stats, setStats] = useState<PharmacyStats>({ pending: 0, dispensed_today: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [dispensingId, setDispensingId] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [queueRes, statsRes] = await Promise.all([
        pharmacyApi.getQueue(activeTab === 'pending' ? 'PENDING' : 'DISPENSED'),
        pharmacyApi.getStats()
      ]);

      if (queueRes.success && queueRes.data) {
        setQueue(queueRes.data);
      } else {
        setError(queueRes.error);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      setError({ message: 'Failed to load pharmacy data' });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 30 seconds for the pending queue
    const interval = setInterval(() => {
      if (activeTab === 'pending') fetchQueue();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue, activeTab]);

  const handleDispense = async (decisionId: string) => {
    setDispensingId(decisionId);
    try {
      const res = await pharmacyApi.dispense(decisionId);
      if (res.success) {
        // Optimistically remove from pending queue
        setQueue(prev => prev.filter(item => item.decision_id !== decisionId));
        setStats(prev => ({
          pending: Math.max(0, prev.pending - 1),
          dispensed_today: prev.dispensed_today + 1
        }));
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError({ message: 'Failed to dispense medicine' });
    } finally {
      setDispensingId(null);
    }
  };

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 flex items-center gap-3">
            <Pill className="w-8 h-8 text-brand-600" /> Dispensary Queue
          </h1>
          <p className="text-surface-500 mt-1">Manage and dispense prescribed medicines.</p>
        </div>
        <div className="flex gap-4">
          <Card className="px-6 py-3 !border-emerald-200 !bg-emerald-50">
            <p className="text-sm font-semibold text-emerald-700">Dispensed Today</p>
            <p className="text-2xl font-bold text-emerald-800">{stats.dispensed_today}</p>
          </Card>
          <Card className="px-6 py-3 !border-amber-200 !bg-amber-50">
            <p className="text-sm font-semibold text-amber-700">Pending</p>
            <p className="text-2xl font-bold text-amber-800">{stats.pending}</p>
          </Card>
        </div>
      </div>

      {error && <ErrorAlert error={error} onClose={() => setError(null)} className="mb-6" />}

      {/* Tabs */}
      <div className="flex border-b border-surface-200 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-brand-500 text-brand-700'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          Pending Queue
        </button>
        <button
          onClick={() => setActiveTab('dispensed')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'dispensed'
              ? 'border-brand-500 text-brand-700'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          Recently Dispensed
        </button>
      </div>

      {isLoading && queue.length === 0 ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner text="Loading queue..." />
        </div>
      ) : queue.length === 0 ? (
        <Card className="text-center py-16">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-surface-900 mb-2">
            {activeTab === 'pending' ? 'Queue is empty' : 'No medicines dispensed yet'}
          </h3>
          <p className="text-surface-500">
            {activeTab === 'pending' 
              ? 'All prescribed medicines have been dispensed.' 
              : 'Medicines dispensed today will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {queue.map(item => (
              <motion.div
                key={item.decision_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-6 bg-white rounded-2xl border transition-all ${
                  activeTab === 'pending' ? 'border-brand-200 shadow-sm hover:shadow-md' : 'border-surface-200'
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  
                  {/* Medicine Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-surface-900">
                        {item.remedy_name}
                      </h3>
                      {item.potency && <Badge variant="primary">{item.potency}</Badge>}
                    </div>
                    <p className="text-surface-600 font-medium text-lg mb-4">
                      Dose: <span className="text-surface-900">{item.dose || 'As prescribed'}</span>
                    </p>
                    
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div className="flex items-center gap-2 text-surface-600">
                        <User className="w-4 h-4 text-surface-400" />
                        Patient: <span className="font-semibold text-surface-900">{item.patient_name}</span>
                        {item.patient_age && ` (${item.patient_age}${item.patient_gender ? ` / ${item.patient_gender}` : ''})`}
                      </div>
                      <div className="flex items-center gap-2 text-surface-600">
                        <UserCheck className="w-4 h-4 text-surface-400" />
                        Doctor: <span className="font-semibold text-surface-900">{item.doctor_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-surface-600">
                        <Clock className="w-4 h-4 text-surface-400" />
                        {activeTab === 'pending' 
                          ? `Prescribed ${formatRelativeDate(item.prescribed_at)}`
                          : `Dispensed ${formatRelativeDate(item.dispensed_at!)}`
                        }
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 w-full md:w-auto flex flex-col gap-2">
                    {activeTab === 'pending' ? (
                      <Button 
                        size="lg" 
                        className="w-full md:w-40 bg-brand-600 hover:bg-brand-700"
                        onClick={() => handleDispense(item.decision_id)}
                        loading={dispensingId === item.decision_id}
                      >
                        Dispense
                      </Button>
                    ) : (
                      <Badge variant="success" className="px-4 py-2 text-sm justify-center">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Dispensed
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/cases/${item.case_id}`)}
                    >
                      View Case
                    </Button>
                  </div>

                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Container>
  );
};

export default PharmacyPage;
