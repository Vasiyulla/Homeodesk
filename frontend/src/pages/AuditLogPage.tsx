import React, { useEffect, useState, useCallback } from 'react';
import { auditApi, type AuditLogEntry, type AuditLogFilters } from '../services/auditApi';
import Container from '../components/Container';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import SelectField from '../components/SelectField';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Clock, User, Globe,
} from 'lucide-react';

const actionBadgeMap: Record<string, 'success' | 'primary' | 'danger' | 'warning' | 'neutral'> = {
  POST: 'success',
  PUT: 'primary',
  PATCH: 'warning',
  DELETE: 'danger',
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const filters: AuditLogFilters = {
      page,
      page_size: 20,
    };
    if (filterAction) filters.action = filterAction;
    if (filterResource) filters.resource_type = filterResource;

    const result = await auditApi.getLogs(filters);
    if (result.success && result.data) {
      setLogs(result.data.items);
      setTotal(result.data.total);
      setTotalPages(result.data.total_pages);
    }
    setLoading(false);
  }, [page, filterAction, filterResource]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterAction, filterResource]);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
  const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <Container className="pt-6">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-violet-600" />
              Audit Trail
            </h1>
            <p className="text-surface-500 mt-1">{total} logged event{total !== 1 ? 's' : ''}</p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
          <div className="w-48">
            <SelectField
              label="Action"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              options={[
                { value: '', label: 'All Actions' },
                { value: 'POST', label: 'CREATE (POST)' },
                { value: 'PUT', label: 'UPDATE (PUT)' },
                { value: 'PATCH', label: 'PATCH' },
                { value: 'DELETE', label: 'DELETE' },
              ]}
            />
          </div>
          <div className="w-48">
            <SelectField
              label="Resource"
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              options={[
                { value: '', label: 'All Resources' },
                { value: 'Case', label: 'Case' },
                { value: 'Patient', label: 'Patient' },
                { value: 'Appointment', label: 'Appointment' },
                { value: 'DoseAdministrationLog', label: 'Dose Log' },
                { value: 'Invoice', label: 'Invoice' },
                { value: 'User', label: 'Staff' },
                { value: 'Department', label: 'Department' },
              ]}
            />
          </div>
        </motion.div>

        {/* Logs */}
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" text="Loading audit logs..." />
          </div>
        ) : logs.length === 0 ? (
          <Card className="text-center py-16 bg-surface-50/50 border-dashed border-2">
            <Shield className="w-12 h-12 text-surface-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-surface-900 mb-2">No audit logs found</h3>
            <p className="text-surface-500 max-w-md mx-auto">
              {filterAction || filterResource ? 'Try adjusting your filters.' : 'Actions will be logged as users interact with the system.'}
            </p>
          </Card>
        ) : (
          <motion.div variants={itemVariants} className="space-y-2">
            {logs.map((log) => (
              <motion.div key={log.id} layout>
                <div
                  className={`
                    glass-card overflow-hidden cursor-pointer transition-all
                    ${expandedId === log.id ? 'ring-2 ring-violet-200 shadow-lg' : 'hover:shadow-md'}
                  `}
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  {/* Main Row */}
                  <div className="px-5 py-4 flex items-center gap-4">
                    <Badge variant={actionBadgeMap[log.action] || 'neutral'}>
                      {log.action}
                    </Badge>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-surface-800">{log.resource_type}</span>
                        <span className="text-xs text-surface-400 truncate">{log.resource_id}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                        {log.actor_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />{log.actor_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{formatDate(log.created_at)}
                        </span>
                        {log.ip_address && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />{log.ip_address}
                          </span>
                        )}
                      </div>
                    </div>

                    {expandedId === log.id ? (
                      <ChevronUp className="w-5 h-5 text-violet-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-surface-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Expanded Payload */}
                  <AnimatePresence>
                    {expandedId === log.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pt-2 border-t border-surface-100">
                          <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Payload</h4>
                          {log.payload_json ? (
                            <pre className="text-xs bg-surface-50 p-4 rounded-xl overflow-x-auto text-surface-700 font-mono leading-relaxed border border-surface-100">
                              {JSON.stringify(log.payload_json, null, 2)}
                            </pre>
                          ) : (
                            <p className="text-xs text-surface-400 italic">No payload data</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div variants={itemVariants} className="flex items-center justify-between py-2">
            <span className="text-sm text-surface-500">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </Container>
  );
};

export default AuditLogPage;
