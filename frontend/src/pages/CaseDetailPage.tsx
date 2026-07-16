import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCaseStore, useFollowUpStore, useAuthStore, useDecisionStore } from '../store/store';
import { caseApi } from '../services/caseApi';
import { followUpApi } from '../services/followUpApi';
import { decisionApi } from '../services/decisionApi';
import { patientApi, type PatientVital } from '../services/patientApi';
import { formatDate, formatRelativeDate } from '../utils/dateFormatter';
import { formatCaseStatus } from '../utils/statusFormatter';
import Container from '../components/Container';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import Badge from '../components/Badge';
import { 
  ArrowLeft, User, Activity, FileText, PlusCircle, 
  CalendarClock, Pill, MessageSquare, BookOpen, X,
  ClipboardList, History, ChevronRight, Clock, TrendingUp,
  AlertCircle, CheckCircle2, MinusCircle, ArrowUpRight, Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HeringsLawVisualizer from '../components/HeringsLawVisualizer';
import MiasmaticRadar from '../components/MiasmaticRadar';

type TabId = 'overview' | 'prescriptions' | 'followups' | 'history' | 'herings_law' | 'miasm_radar';

const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { currentCase, setCurrentCase, updateCase: updateCaseInStore, isLoading, setLoading, error, setError } = useCaseStore();
  const { followUps, setFollowUps } = useFollowUpStore();
  const { decisions, setDecisions } = useDecisionStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Remedy state
  const [remedies, setRemedies] = useState<string[]>([]);
  const [manualRemedyInput, setManualRemedyInput] = useState('');
  const [isSavingRemedy, setIsSavingRemedy] = useState(false);

  // Vitals state
  const [latestVitals, setLatestVitals] = useState<PatientVital | null>(null);

  // Symptoms UI State
  const [newSymptomText, setNewSymptomText] = useState('');
  const [isAddingSymptom, setIsAddingSymptom] = useState(false);

  // Patient history state
  const [patientHistory, setPatientHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isDoctor = user?.role === 'DOCTOR' || user?.role === 'OWNER';

  useEffect(() => {
    if (!caseId) return;

    const fetchCaseDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const [caseResult, followUpsResult, decisionsResult] = await Promise.all([
          caseApi.getCase(caseId),
          followUpApi.getFollowUps(caseId),
          decisionApi.getDecisions(caseId)
        ]);

        if (caseResult.success && caseResult.data) {
          setCurrentCase(caseResult.data);
          
          // Fetch vitals using the patient_id from the case
          if (caseResult.data.patient_id) {
            const vitalsResult = await patientApi.getVitals(caseResult.data.patient_id);
            if (vitalsResult.success && vitalsResult.data && vitalsResult.data.length > 0) {
              setLatestVitals(vitalsResult.data[0]);
            }
          }
        } else {
          setError(caseResult.error || { status: 500, message: 'Failed to fetch case details', errors: null });
        }

        if (followUpsResult.success && followUpsResult.data) {
          setFollowUps(followUpsResult.data);
        }

        if (decisionsResult.success && decisionsResult.data) {
          setDecisions(decisionsResult.data);
        }
      } catch (err) {
        setError({ status: 500, message: 'An unexpected error occurred.', errors: null });
      } finally {
        setLoading(false);
      }
    };

    fetchCaseDetails();
  }, [caseId, setCurrentCase, setFollowUps, setDecisions, setLoading, setError]);

  // Load patient history when that tab is clicked
  useEffect(() => {
    if (activeTab === 'history' && currentCase?.patient_id && !patientHistory) {
      setHistoryLoading(true);
      caseApi.getPatientCaseHistory(currentCase.patient_id).then(result => {
        if (result.success && result.data) {
          setPatientHistory(result.data);
        }
        setHistoryLoading(false);
      });
    }
  }, [activeTab, currentCase?.patient_id, patientHistory]);

  // Sync local remedy state when case loads
  useEffect(() => {
    if (currentCase) {
      const raw = currentCase.remedy_name || '';
      setRemedies(raw ? raw.split(',').map((r: string) => r.trim()).filter(Boolean) : []);
    }
  }, [currentCase]);

  const persistRemedies = async (updatedList: string[]) => {
    if (!caseId) return;
    setIsSavingRemedy(true);
    const joined = updatedList.join(', ');
    try {
      const result = await caseApi.updateCase(caseId, { remedy_name: joined });
      if (result.success && result.data) {
        setRemedies(updatedList);
        updateCaseInStore(caseId, { remedy_name: joined });
      } else {
        setError(result.error || { status: 500, message: 'Failed to save remedy', errors: null });
      }
    } catch (err) {
      setError({ status: 500, message: 'An unexpected error occurred.', errors: null });
    } finally {
      setIsSavingRemedy(false);
    }
  };

  const handleAddManualRemedy = () => {
    const name = manualRemedyInput.trim();
    if (!name || remedies.includes(name)) return;
    const updated = [...remedies, name];
    setManualRemedyInput('');
    persistRemedies(updated);
  };

  const handleRemoveRemedy = (remedyToRemove: string) => {
    const updated = remedies.filter((r) => r !== remedyToRemove);
    persistRemedies(updated);
  };

  const handleAddSymptom = async () => {
    if (!caseId || !currentCase || !newSymptomText.trim()) return;
    setIsAddingSymptom(true);
    
    const newSymptom = {
      id: Date.now().toString(),
      name: newSymptomText.trim(),
      text: newSymptomText.trim(),
      appearance_date: new Date().toISOString(),
      status: 'Active'
    };

    const updatedSymptoms = [...(currentCase.symptoms || []), newSymptom];
    
    try {
      const result = await caseApi.updateCase(caseId, { symptoms: updatedSymptoms } as any);
      if (result.success && result.data) {
        setCurrentCase(result.data);
        updateCaseInStore(caseId, { symptoms: updatedSymptoms });
        setNewSymptomText('');
      } else {
        setError(result.error || { status: 500, message: 'Failed to add symptom', errors: null });
      }
    } catch (err) {
      setError({ status: 500, message: 'Error adding symptom', errors: null });
    } finally {
      setIsAddingSymptom(false);
    }
  };

  const handleRemoveSymptom = async (symptomId: string) => {
    if (!caseId || !currentCase) return;
    const updatedSymptoms = (currentCase.symptoms || []).filter((s: any) => s.id !== symptomId);
    
    try {
      const result = await caseApi.updateCase(caseId, { symptoms: updatedSymptoms } as any);
      if (result.success && result.data) {
        setCurrentCase(result.data);
        updateCaseInStore(caseId, { symptoms: updatedSymptoms });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <Container className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner text="Loading patient record..." size="lg" />
      </Container>
    );
  }

  if (!currentCase) {
    return (
      <Container>
        <Card className="text-center py-16 max-w-lg mx-auto">
          <FileText className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-surface-900 mb-2">Case Not Found</h2>
          <p className="text-surface-500 mb-6">The requested case record does not exist or you do not have permission to view it.</p>
          <Button onClick={() => navigate('/cases')} icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Cases
          </Button>
        </Card>
      </Container>
    );
  }

  const reactionIcon = (reaction: string | null) => {
    switch (reaction) {
      case 'improvement': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'aggravation': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'stationary': return <MinusCircle className="w-4 h-4 text-surface-400" />;
      default: return <Clock className="w-4 h-4 text-surface-400" />;
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'prescriptions', label: 'Prescriptions', icon: <Pill className="w-4 h-4" />, count: decisions.length },
    { id: 'followups', label: 'Follow-ups', icon: <MessageSquare className="w-4 h-4" />, count: followUps.length },
    { id: 'herings_law', label: 'Hering\'s Law', icon: <Activity className="w-4 h-4" /> },
    { id: 'miasm_radar', label: 'Miasm Analysis', icon: <Activity className="w-4 h-4" /> },
    { id: 'history', label: 'Patient History', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <Container>
      {error && <ErrorAlert error={error} onClose={() => setError(null)} className="mb-6" />}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <button 
            onClick={() => navigate('/cases')} 
            className="flex items-center text-sm font-medium text-surface-500 hover:text-surface-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Cases
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-surface-900">
              {currentCase.patient_name} {currentCase.patient_display_id && <span className="text-surface-400 font-normal text-xl ml-2">({currentCase.patient_display_id})</span>}
            </h1>
            <Badge variant={currentCase.status === 'CLOSED' ? 'success' : currentCase.status === 'DRAFT' ? 'neutral' : 'primary'}>{formatCaseStatus(currentCase.status)}</Badge>
          </div>
          <p className="text-sm text-surface-500 mt-1 flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4" />
            Created {formatRelativeDate(currentCase.created_at)}
          </p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      {isDoctor && (
        <div className="flex flex-wrap gap-2 mb-6 p-3 bg-white rounded-xl border border-surface-200 shadow-sm">
          <Button
            size="sm"
            onClick={() => navigate(`/cases/${caseId}/add-followup`)}
            icon={<MessageSquare className="w-4 h-4" />}
            variant="secondary"
          >
            Add Follow-up
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(`/cases/${caseId}/add-decision`)}
            icon={<Pill className="w-4 h-4" />}
            variant="secondary"
          >
            Prescribe Remedy
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(`/repertory?caseId=${caseId}`)}
            icon={<BookOpen className="w-4 h-4" />}
            variant="ghost"
          >
            Repertory
          </Button>
          {currentCase.status !== 'CLOSED' && (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-surface-500 hover:text-red-600"
              onClick={async () => {
                const result = await caseApi.updateCase(caseId!, { status: 'CLOSED' } as any);
                if (result.success && result.data) {
                  updateCaseInStore(caseId!, { status: 'CLOSED' });
                  setCurrentCase(result.data);
                }
              }}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Close Case
            </Button>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-surface-100 rounded-xl mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-500 hover:text-surface-700 hover:bg-white/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === tab.id ? 'bg-brand-100 text-brand-700' : 'bg-surface-200 text-surface-500'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* ─── OVERVIEW TAB ─────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              {latestVitals && (
                <Card className="bg-gradient-to-br from-brand-50 to-emerald-50 border-brand-100">
                  <h3 className="text-lg font-bold text-brand-900 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-brand-600" />
                    Latest Vitals <span className="text-sm font-normal text-brand-600/70 ml-2">(Recorded {formatRelativeDate(latestVitals.recorded_at)})</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {latestVitals.blood_pressure && (
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-brand-100/50 flex flex-col">
                        <span className="text-xs font-semibold text-surface-500 uppercase">Blood Pressure</span>
                        <span className="text-lg font-bold text-surface-900">{latestVitals.blood_pressure}</span>
                      </div>
                    )}
                    {latestVitals.pulse && (
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-brand-100/50 flex flex-col">
                        <span className="text-xs font-semibold text-surface-500 uppercase">Pulse</span>
                        <span className="text-lg font-bold text-surface-900">{latestVitals.pulse} <span className="text-xs font-medium text-surface-400">bpm</span></span>
                      </div>
                    )}
                    {latestVitals.temperature && (
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-brand-100/50 flex flex-col">
                        <span className="text-xs font-semibold text-surface-500 uppercase">Temperature</span>
                        <span className="text-lg font-bold text-surface-900">{latestVitals.temperature} <span className="text-xs font-medium text-surface-400">°F</span></span>
                      </div>
                    )}
                    {latestVitals.weight && (
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-brand-100/50 flex flex-col">
                        <span className="text-xs font-semibold text-surface-500 uppercase">Weight</span>
                        <span className="text-lg font-bold text-surface-900">{latestVitals.weight} <span className="text-xs font-medium text-surface-400">kg</span></span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <Card title="Clinical Summary" icon={<Activity className="w-5 h-5" />}>
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-100 mb-4">
                  <h4 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-2">Chief Complaint</h4>
                  <p className="text-surface-900 font-medium">{currentCase.chief_complaint}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-surface-700 uppercase tracking-wider mb-2">Case Notes</h4>
                  <p className="text-surface-600 whitespace-pre-wrap leading-relaxed text-sm">
                    {currentCase.case_notes || 'No detailed notes provided.'}
                  </p>
                </div>
              </Card>

              {/* Case Symptoms */}
              <Card title="Tracked Symptoms" icon={<Activity className="w-5 h-5" />}>
                {currentCase.symptoms && currentCase.symptoms.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {currentCase.symptoms.map((sym: any) => (
                      <div key={sym.id} className="flex items-center justify-between p-3 bg-surface-50 border border-surface-100 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-surface-900">{sym.name || sym.text}</p>
                          <div className="flex gap-2 mt-1">
                            {sym.region && <span className="text-xs text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">{sym.region}</span>}
                            {sym.status && <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{sym.status}</span>}
                          </div>
                        </div>
                        {isDoctor && (
                          <button onClick={() => handleRemoveSymptom(sym.id)} className="text-surface-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-surface-500 mb-4 italic">No symptoms tracked for this case yet.</p>
                )}

                {isDoctor && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSymptomText}
                      onChange={(e) => setNewSymptomText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSymptom()}
                      placeholder="e.g. Destructive bone pain at night..."
                      className="flex-1 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm text-surface-900 focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                    <Button size="sm" onClick={handleAddSymptom} loading={isAddingSymptom}>
                      Add
                    </Button>
                  </div>
                )}
              </Card>

              {/* Case Remedy Selection — Doctor Only */}
              {isDoctor && (
                <Card title="Case Remedies" icon={<Pill className="w-5 h-5" />}>
                  {remedies.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {remedies.map((rem) => (
                          <span
                            key={rem}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-sm font-semibold text-emerald-800"
                          >
                            <Pill className="w-3.5 h-3.5" />
                            {rem}
                            <button
                              onClick={() => handleRemoveRemedy(rem)}
                              disabled={isSavingRemedy}
                              className="ml-0.5 p-0.5 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-7 h-7 text-surface-400" />
                      </div>
                      <p className="text-surface-500 text-sm mb-4">No remedies selected. Pick from the Remedy Index.</p>
                      <Button
                        onClick={() => navigate(`/repertory?caseId=${caseId}`)}
                        icon={<BookOpen className="w-4 h-4" />}
                      >
                        Open Remedy Index
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-surface-100">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={manualRemedyInput}
                        onChange={(e) => setManualRemedyInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddManualRemedy()}
                        placeholder="Type a remedy name and press Enter..."
                        className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-sm text-surface-900 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none transition-all"
                      />
                    </div>
                    <Button onClick={handleAddManualRemedy} loading={isSavingRemedy} size="sm" icon={<PlusCircle className="w-4 h-4" />}>
                      Add
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column: Sidebar info */}
            <div className="space-y-6">
              <Card title="Patient Info" icon={<User className="w-5 h-5" />}>
                <ul className="space-y-4">
                  <li className="flex justify-between items-center pb-3 border-b border-surface-100">
                    <span className="text-surface-500 text-sm">Age</span>
                    <span className="font-semibold text-surface-900">{currentCase.patient_age ? `${currentCase.patient_age} yrs` : 'N/A'}</span>
                  </li>
                  <li className="flex justify-between items-center pb-3 border-b border-surface-100">
                    <span className="text-surface-500 text-sm">Gender</span>
                    <span className="font-semibold text-surface-900">
                      {currentCase.patient_gender === 'M' || currentCase.patient_gender?.toLowerCase() === 'male' ? 'Male' : 
                       currentCase.patient_gender === 'F' || currentCase.patient_gender?.toLowerCase() === 'female' ? 'Female' : 
                       currentCase.patient_gender || 'Other'}
                    </span>
                  </li>
                  <li className="flex justify-between items-center pb-3 border-b border-surface-100">
                    <span className="text-surface-500 text-sm">Status</span>
                    <Badge variant={currentCase.status === 'CLOSED' ? 'success' : currentCase.status === 'DRAFT' ? 'neutral' : 'primary'}>
                      {formatCaseStatus(currentCase.status)}
                    </Badge>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-surface-500 text-sm">Follow-ups</span>
                    <span className="font-semibold text-surface-900">{followUps.length}</span>
                  </li>
                </ul>
              </Card>

              {/* Quick Stats */}
              <Card className="!p-4 bg-gradient-to-br from-surface-50 to-surface-100/50">
                <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Case Summary</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-white rounded-xl border border-surface-100">
                    <p className="text-2xl font-bold text-brand-600">{decisions.length}</p>
                    <p className="text-xs text-surface-500 mt-0.5">Prescriptions</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-xl border border-surface-100">
                    <p className="text-2xl font-bold text-emerald-600">{followUps.length}</p>
                    <p className="text-xs text-surface-500 mt-0.5">Follow-ups</p>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ─── PRESCRIPTIONS TAB ────────────────────────────────────── */}
        {activeTab === 'prescriptions' && (
          <motion.div
            key="prescriptions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-surface-900">Prescription History</h2>
              {isDoctor && (
                <Button size="sm" onClick={() => navigate(`/cases/${caseId}/add-decision`)} icon={<PlusCircle className="w-4 h-4" />}>
                  New Prescription
                </Button>
              )}
            </div>

            {decisions.length === 0 ? (
              <Card className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                  <Pill className="w-8 h-8 text-surface-300" />
                </div>
                <h3 className="text-lg font-medium text-surface-900 mb-2">No Prescriptions Yet</h3>
                <p className="text-surface-500 text-sm mb-4">No remedies have been prescribed for this case.</p>
                {isDoctor && (
                  <Button onClick={() => navigate(`/cases/${caseId}/add-decision`)} icon={<PlusCircle className="w-4 h-4" />}>
                    Add First Prescription
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-3">
                {decisions.map((d, idx) => (
                  <Card key={d.id} className="!p-0 overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            idx === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-500'
                          }`}>
                            <Pill className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-surface-900 text-lg">{d.remedy_name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              {d.potency && <Badge variant="primary">{d.potency}</Badge>}
                              {d.dose && <span className="text-sm text-surface-500">Dose: {d.dose}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={d.confidence === 'high' ? 'success' : d.confidence === 'low' ? 'danger' : 'neutral'}>
                            {d.confidence} confidence
                          </Badge>
                          <p className="text-xs text-surface-400 mt-1">{formatDate(d.created_at)}</p>
                        </div>
                      </div>
                      {d.reasoning && (
                        <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-100 mt-3">
                          <p className="text-sm font-semibold text-surface-600 mb-1">Reasoning</p>
                          <p className="text-sm text-surface-700 leading-relaxed">{d.reasoning}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ─── FOLLOW-UPS TAB ──────────────────────────────────────── */}
        {activeTab === 'followups' && (
          <motion.div
            key="followups"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-surface-900">Follow-up Timeline</h2>
              <Button size="sm" onClick={() => navigate(`/cases/${caseId}/add-followup`)} icon={<PlusCircle className="w-4 h-4" />}>
                Add Follow-up
              </Button>
            </div>

            {followUps.length === 0 ? (
              <Card className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-surface-300" />
                </div>
                <h3 className="text-lg font-medium text-surface-900 mb-2">No Follow-ups Yet</h3>
                <p className="text-surface-500 text-sm mb-4">Record patient reactions and observations over time.</p>
                <Button onClick={() => navigate(`/cases/${caseId}/add-followup`)} icon={<PlusCircle className="w-4 h-4" />}>
                  Record First Follow-up
                </Button>
              </Card>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-surface-200" />

                <div className="space-y-4">
                  {followUps.map((f, idx) => (
                    <div key={f.id} className="relative pl-14">
                      {/* Timeline dot */}
                      <div className={`absolute left-4 top-5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        f.reaction === 'improvement' ? 'bg-emerald-100 border-emerald-400' :
                        f.reaction === 'aggravation' ? 'bg-red-100 border-red-400' :
                        'bg-surface-100 border-surface-300'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          f.reaction === 'improvement' ? 'bg-emerald-500' :
                          f.reaction === 'aggravation' ? 'bg-red-500' :
                          'bg-surface-400'
                        }`} />
                      </div>

                      <Card className="!p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {reactionIcon(f.reaction)}
                            <Badge variant={
                              f.reaction === 'improvement' ? 'success' : 
                              f.reaction === 'aggravation' ? 'danger' : 'neutral'
                            }>
                              {f.reaction || 'Unknown'}
                            </Badge>
                            {f.days_since_dose != null && (
                              <span className="text-sm text-surface-500">
                                {f.days_since_dose} day{f.days_since_dose !== 1 ? 's' : ''} since dose
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-surface-400">{formatDate(f.created_at)}</span>
                        </div>

                        {f.observations && (
                          <p className="text-sm text-surface-700 mt-2 leading-relaxed">{f.observations}</p>
                        )}

                        {f.notes && (
                          <div className="mt-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                            <p className="text-xs font-semibold text-amber-700 mb-0.5">Doctor's Notes</p>
                            <p className="text-sm text-amber-800">{f.notes}</p>
                          </div>
                        )}

                        {f.new_symptoms && f.new_symptoms.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-xs font-semibold text-surface-500 mr-1">New symptoms:</span>
                            {f.new_symptoms.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                                {s.text || s.name || JSON.stringify(s)}
                              </span>
                            ))}
                          </div>
                        )}
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── PATIENT HISTORY TAB ─────────────────────────────────── */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="mb-2">
              <h2 className="text-xl font-bold text-surface-900">
                All Cases for {currentCase.patient_name}
              </h2>
              <p className="text-sm text-surface-500">Complete treatment history across all visits</p>
            </div>

            {historyLoading ? (
              <Card className="min-h-[200px] flex items-center justify-center">
                <LoadingSpinner text="Loading patient history..." />
              </Card>
            ) : !patientHistory || patientHistory.cases.length === 0 ? (
              <Card className="text-center py-12">
                <History className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-surface-900 mb-2">No Other Cases</h3>
                <p className="text-surface-500 text-sm">This is the only case for this patient.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {patientHistory.cases.map((c: any) => {
                  const isCurrentCase = c.id === caseId;
                  return (
                    <Card
                      key={c.id}
                      className={`!p-0 overflow-hidden transition-all ${
                        isCurrentCase
                          ? 'ring-2 ring-brand-300 bg-brand-50/30'
                          : 'hover:shadow-md cursor-pointer'
                      }`}
                      onClick={() => !isCurrentCase && navigate(`/cases/${c.id}`)}
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2 mb-1">
                              {isCurrentCase && (
                                <Badge variant="primary">Current Case</Badge>
                              )}
                              <Badge variant={c.status === 'CLOSED' ? 'success' : c.status === 'DRAFT' ? 'neutral' : 'primary'}>
                                {formatCaseStatus(c.status)}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-surface-900">
                              {c.chief_complaint || 'No complaint noted'}
                            </h3>
                            <p className="text-xs text-surface-400 mt-1 flex items-center gap-1">
                              <CalendarClock className="w-3 h-3" />
                              {formatDate(c.created_at)}
                            </p>
                          </div>
                          {!isCurrentCase && (
                            <ChevronRight className="w-5 h-5 text-surface-300 flex-shrink-0" />
                          )}
                        </div>

                        {/* Case notes preview */}
                        {c.case_notes && (
                          <p className="text-sm text-surface-600 mt-2 line-clamp-2">{c.case_notes}</p>
                        )}

                        {/* Decisions */}
                        {c.decisions && c.decisions.length > 0 && (
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <Pill className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            {c.decisions.map((d: any) => (
                              <span key={d.id} className="inline-flex items-center px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-medium text-emerald-700">
                                {d.remedy_name} {d.potency && <span className="text-emerald-500 ml-1">{d.potency}</span>}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Follow-ups summary */}
                        {c.follow_ups && c.follow_ups.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-surface-500">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{c.follow_ups.length} follow-up{c.follow_ups.length !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>Latest: </span>
                            <Badge variant={
                              c.follow_ups[0].reaction === 'improvement' ? 'success' :
                              c.follow_ups[0].reaction === 'aggravation' ? 'danger' : 'neutral'
                            }>
                              {c.follow_ups[0].reaction || 'unknown'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ─── HERING'S LAW TAB ──────────────────────────────────── */}
        {activeTab === 'herings_law' && (
          <motion.div
            key="herings_law"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="mb-2">
              <h2 className="text-xl font-bold text-surface-900">Hering's Law of Cure Tracker</h2>
              <p className="text-sm text-surface-500">Chronological analysis of symptom progression</p>
            </div>
            
            <HeringsLawVisualizer symptoms={currentCase.symptoms || []} />
          </motion.div>
        )}

        {/* ─── MIASM RADAR TAB ──────────────────────────────────── */}
        {activeTab === 'miasm_radar' && (
          <motion.div
            key="miasm_radar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="mb-2">
              <h2 className="text-xl font-bold text-surface-900">Miasmatic Radar</h2>
              <p className="text-sm text-surface-500">Deep constitutional analysis based on current symptoms</p>
            </div>
            
            <MiasmaticRadar symptoms={currentCase.symptoms || []} />
          </motion.div>
        )}
      </AnimatePresence>
    </Container>
  );
};

export default CaseDetailPage;
