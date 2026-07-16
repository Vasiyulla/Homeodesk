import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useCaseStore } from '../store/store';
import { caseApi } from '../services/caseApi';
import { formatDate, formatRelativeDate } from '../utils/dateFormatter';
import { formatCaseStatus } from '../utils/statusFormatter';
import Container from '../components/Container';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import Badge from '../components/Badge';
import {
  Search, Plus, ChevronRight, FileText, Pill,
  MessageSquare, LayoutGrid, LayoutList, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type StatusFilter = 'all' | 'DRAFT' | 'WAITING_FOR_DOCTOR' | 'REMEDY_PRESCRIBED' | 'UNDER_OBSERVATION' | 'CLOSED';

const STATUS_CHIPS: { id: StatusFilter; label: string; color: string }[] = [
  { id: 'all', label: 'All Cases', color: 'bg-surface-100 text-surface-700' },
  { id: 'DRAFT', label: 'Draft', color: 'bg-surface-100 text-surface-600' },
  { id: 'WAITING_FOR_DOCTOR', label: 'Waiting', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'REMEDY_PRESCRIBED', label: 'Prescribed', color: 'bg-brand-50 text-brand-700 border-brand-200' },
  { id: 'UNDER_OBSERVATION', label: 'Observing', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'CLOSED', label: 'Closed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

const CasesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { cases, setCases, isLoading, setLoading, error, setError } = useCaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const location = useLocation();

  // Auto-detect mobile and default to card view
  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode('card');
    }
  }, []);

  // Read status from URL query params
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const qStatus = queryParams.get('status');
    if (qStatus === 'pending') {
      setStatusFilter('DRAFT');
    }
  }, [location.search]);

  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await caseApi.listMyCases();
        if (result.success && result.data) {
          setCases(result.data);
        } else {
          setError(result.error || { status: 500, message: 'Failed to load cases', errors: null });
        }
      } catch (err) {
        setError({ status: 500, message: 'An unexpected error occurred', errors: null });
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, [setCases, setLoading, setError]);

  const filteredCases = cases
    .filter((c) => {
      if (statusFilter === 'all') return true;
      return c.status === statusFilter;
    })
    .filter(
      (c) =>
        c.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.chief_complaint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.remedy_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Count per status
  const statusCounts: Record<StatusFilter, number> = {
    all: cases.length,
    DRAFT: cases.filter(c => c.status === 'DRAFT').length,
    WAITING_FOR_DOCTOR: cases.filter(c => c.status === 'WAITING_FOR_DOCTOR').length,
    REMEDY_PRESCRIBED: cases.filter(c => c.status === 'REMEDY_PRESCRIBED').length,
    UNDER_OBSERVATION: cases.filter(c => c.status === 'UNDER_OBSERVATION').length,
    CLOSED: cases.filter(c => c.status === 'CLOSED').length,
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'CLOSED': return 'success' as const;
      case 'DRAFT': return 'neutral' as const;
      case 'REMEDY_PRESCRIBED': return 'primary' as const;
      case 'UNDER_OBSERVATION': return 'primary' as const;
      case 'WAITING_FOR_DOCTOR': return 'warning' as const;
      default: return 'neutral' as const;
    }
  };

  return (
    <Container>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">My Cases</h1>
          <p className="text-surface-500 mt-1">Manage and track your patient records</p>
        </div>
        <Button onClick={() => navigate('/cases/new')} icon={<Plus className="w-4 h-4" />} className="shadow-glow">
          New Case
        </Button>
      </div>

      {error && <ErrorAlert error={error} onClose={() => setError(null)} className="mb-6" />}

      {/* Search + View Toggle */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            placeholder="Search patients, complaints, or remedies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-surface-900"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-surface-100 rounded-xl">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-400 hover:text-surface-600'}`}
            title="Table view"
          >
            <LayoutList className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-400 hover:text-surface-600'}`}
            title="Card view"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Status Filter Chips */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_CHIPS.map(chip => {
          const count = statusCounts[chip.id];
          if (chip.id !== 'all' && count === 0) return null; // Hide empty statuses
          return (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${
                statusFilter === chip.id
                  ? 'ring-2 ring-brand-300 ring-offset-1 bg-white text-brand-700 border-brand-300 shadow-sm'
                  : `${chip.color} border-transparent hover:border-surface-300`
              }`}
            >
              {chip.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                statusFilter === chip.id ? 'bg-brand-100 text-brand-700' : 'bg-black/5'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <Card className="min-h-[400px] flex items-center justify-center">
          <LoadingSpinner text="Loading cases..." size="lg" />
        </Card>
      ) : cases.length === 0 ? (
        <Card className="text-center py-16 bg-surface-50 border-dashed border-2">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FileText className="w-8 h-8 text-surface-300" />
          </div>
          <h3 className="text-lg font-medium text-surface-900 mb-2">No Cases Found</h3>
          <p className="text-surface-500 mb-6 max-w-md mx-auto">
            You haven't created any cases yet. Start by creating a new case record.
          </p>
          <Button onClick={() => navigate('/cases/new')} icon={<Plus className="w-4 h-4" />}>
            Create Your First Case
          </Button>
        </Card>
      ) : filteredCases.length === 0 ? (
        <Card className="text-center py-12">
          <Search className="w-8 h-8 text-surface-300 mx-auto mb-3" />
          <p className="text-surface-500">No cases match your search or filter criteria.</p>
        </Card>
      ) : viewMode === 'table' ? (
        /* ─── TABLE VIEW ──────────────────────────────────────────── */
        <div className="bg-white rounded-2xl shadow-glass-sm border border-surface-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">Complaint</th>
                  <th className="px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider hidden lg:table-cell">Remedy</th>
                  <th className="px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider hidden md:table-cell">Created</th>
                  <th className="px-6 py-4 text-xs font-semibold text-surface-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredCases.map((c) => (
                  <motion.tr 
                    key={c.id}
                    whileHover={{ backgroundColor: 'rgba(248, 250, 252, 1)' }}
                    className="cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap" onClick={() => navigate(`/cases/${c.id}`)}>
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold mr-3 border border-brand-200">
                          {c.patient_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-surface-900">
                            {c.patient_name || 'Unnamed'}
                          </div>
                          {c.patient_display_id && (
                            <div className="text-xs text-surface-400">{c.patient_display_id}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={() => navigate(`/cases/${c.id}`)}>
                      <div className="text-sm text-surface-600 truncate max-w-xs">
                        {c.chief_complaint || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell" onClick={() => navigate(`/cases/${c.id}`)}>
                      {c.remedy_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-medium text-emerald-700">
                          <Pill className="w-3 h-3" />
                          {c.remedy_name}
                        </span>
                      ) : (
                        <span className="text-xs text-surface-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={() => navigate(`/cases/${c.id}`)}>
                      <Badge variant={getBadgeVariant(c.status)}>{formatCaseStatus(c.status)}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500 hidden md:table-cell" onClick={() => navigate(`/cases/${c.id}`)}>
                      {formatRelativeDate(c.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate(`/cases/${c.id}`)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-surface-400 hover:text-brand-600 transition-colors"
                          title="View case"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/cases/${c.id}/add-followup`)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-surface-400 hover:text-emerald-600 transition-colors"
                          title="Add follow-up"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                      <ChevronRight className="w-5 h-5 text-surface-300 group-hover:hidden inline-block" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── CARD VIEW (Mobile Friendly) ─────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((c) => (
            <motion.div
              key={c.id}
              whileHover={{ y: -2 }}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="cursor-pointer"
            >
              <Card className="!p-0 overflow-hidden hover:shadow-lg transition-all h-full flex flex-col">
                {/* Card Header */}
                <div className="p-4 pb-3 flex items-center gap-3 border-b border-surface-100">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-brand-700 font-bold flex-shrink-0">
                    {c.patient_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-surface-900 truncate">{c.patient_name || 'Unnamed'}</h3>
                    {c.patient_display_id && (
                      <span className="text-xs text-surface-400">{c.patient_display_id}</span>
                    )}
                  </div>
                  <Badge variant={getBadgeVariant(c.status)}>{formatCaseStatus(c.status)}</Badge>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1">
                  <p className="text-sm text-surface-700 font-medium line-clamp-2 mb-3">
                    {c.chief_complaint || 'No complaint noted'}
                  </p>

                  {c.remedy_name && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Pill className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-700 truncate">{c.remedy_name}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 bg-surface-50/50 border-t border-surface-100 flex items-center justify-between">
                  <span className="text-xs text-surface-400">{formatRelativeDate(c.created_at)}</span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/cases/${c.id}/add-followup`)}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-surface-400 hover:text-emerald-600 transition-colors"
                      title="Add follow-up"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-surface-300" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </Container>
  );
};

export default CasesListPage;
