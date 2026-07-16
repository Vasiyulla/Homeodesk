import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../store/store';
import { analyticsApi, type AnalyticsSummary, type WeeklyCount, type TopRemedy, type StaffActivityItem } from '../services/analyticsApi';
import Container from '../components/Container';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import { motion } from 'framer-motion';
import {
  Users, Activity, DollarSign, TrendingUp,
  Pill, Stethoscope, Syringe, BarChart3,
} from 'lucide-react';

const AnalyticsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [caseTrend, setCaseTrend] = useState<WeeklyCount[]>([]);
  const [topRemedies, setTopRemedies] = useState<TopRemedy[]>([]);
  const [staffActivity, setStaffActivity] = useState<StaffActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [s, c, r, a] = await Promise.all([
        analyticsApi.getSummary(),
        analyticsApi.getCasesOverTime(12),
        analyticsApi.getTopRemedies(10),
        analyticsApi.getStaffActivity(),
      ]);
      if (s.success) setSummary(s.data!);
      if (c.success) setCaseTrend(c.data!);
      if (r.success) setTopRemedies(r.data!);
      if (a.success) setStaffActivity(a.data!);
      setLoading(false);
    };
    load();
  }, []);

  const maxCaseCount = useMemo(() => Math.max(...caseTrend.map(w => w.count), 1), [caseTrend]);
  const maxRemedyCount = useMemo(() => Math.max(...topRemedies.map(r => r.prescription_count), 1), [topRemedies]);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  if (loading) {
    return (
      <Container className="pt-6 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading analytics..." />
      </Container>
    );
  }

  const stats = [
    { label: 'Total Patients', value: summary?.total_patients ?? 0, icon: Users, color: 'brand', gradient: 'from-blue-500 to-indigo-600' },
    { label: 'Active Cases', value: summary?.active_cases ?? 0, icon: Activity, color: 'emerald', gradient: 'from-emerald-500 to-teal-600' },
    { label: 'Revenue Collected', value: `₹${(summary?.total_revenue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'amber', gradient: 'from-amber-500 to-orange-600' },
    { label: 'Pending Revenue', value: `₹${(summary?.pending_revenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: 'rose', gradient: 'from-rose-500 to-pink-600' },
  ];

  return (
    <Container className="pt-6">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-surface-900">Analytics</h1>
            <p className="text-surface-500 mt-1">Clinic-wide performance overview</p>
          </div>
          <Badge variant="primary">{user?.organization_name || 'Clinic'}</Badge>
        </motion.div>

        {/* Stat Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 24 }}
            >
              <Card className="!p-0 overflow-hidden group hover:shadow-xl transition-shadow">
                <div className={`h-1.5 bg-gradient-to-r ${stat.gradient}`} />
                <div className="p-6 flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-surface-900 mt-1">{stat.value}</h3>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Case Trend Bar Chart */}
          <motion.div variants={itemVariants}>
            <Card className="!p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-bold text-surface-900">Cases Over Time</h2>
                <span className="text-xs text-surface-400 ml-auto">Last 12 weeks</span>
              </div>
              {caseTrend.length === 0 ? (
                <p className="text-surface-400 text-sm text-center py-8">No data available yet</p>
              ) : (
                <div className="flex items-end gap-2 h-48">
                  {caseTrend.map((week, i) => {
                    const pct = maxCaseCount > 0 ? (week.count / maxCaseCount) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <span className="text-xs font-bold text-surface-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          {week.count}
                        </span>
                        <motion.div
                          className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 cursor-pointer group-hover:from-brand-700 group-hover:to-brand-500 transition-colors"
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(pct, 4)}%` }}
                          transition={{ delay: i * 0.05, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                        />
                        <span className="text-[10px] text-surface-400 font-medium truncate w-full text-center">
                          {week.week_label.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Top Remedies */}
          <motion.div variants={itemVariants}>
            <Card className="!p-6">
              <div className="flex items-center gap-2 mb-6">
                <Pill className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-surface-900">Top Remedies</h2>
              </div>
              {topRemedies.length === 0 ? (
                <p className="text-surface-400 text-sm text-center py-8">No prescriptions recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {topRemedies.map((remedy, i) => {
                    const pct = (remedy.prescription_count / maxRemedyCount) * 100;
                    return (
                      <div key={remedy.remedy_name} className="group">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-surface-700 truncate flex-1">
                            {remedy.remedy_name}
                          </span>
                          <span className="text-xs font-bold text-surface-500 ml-2">
                            {remedy.prescription_count}
                          </span>
                        </div>
                        <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.08, duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Staff Activity */}
        <motion.div variants={itemVariants}>
          <Card className="!p-6">
            <div className="flex items-center gap-2 mb-6">
              <Stethoscope className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-bold text-surface-900">Staff Activity</h2>
            </div>
            {staffActivity.length === 0 ? (
              <p className="text-surface-400 text-sm text-center py-8">No staff activity data yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffActivity.map((item) => {
                  const isDoctor = item.role === 'DOCTOR';
                  return (
                    <div
                      key={item.user_id + item.metric_label}
                      className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 border border-surface-100 hover:border-surface-200 transition-colors"
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDoctor ? 'bg-violet-100 text-violet-600' : 'bg-sky-100 text-sky-600'}`}>
                        {isDoctor ? <Stethoscope className="w-5 h-5" /> : <Syringe className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-800 truncate">{item.full_name || 'Unknown'}</p>
                        <p className="text-xs text-surface-400">{item.metric_label}</p>
                      </div>
                      <span className="text-xl font-bold text-surface-900">{item.metric_value}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Summary Footer */}
        <motion.div variants={itemVariants} className="flex items-center justify-between py-4 px-6 bg-surface-50 rounded-2xl border border-surface-100">
          <div className="flex items-center gap-6 text-sm text-surface-500">
            <span>Total Staff: <strong className="text-surface-800">{summary?.total_staff ?? 0}</strong></span>
            <span>Total Cases: <strong className="text-surface-800">{summary?.total_cases ?? 0}</strong></span>
            <span>Closed: <strong className="text-surface-800">{summary?.closed_cases ?? 0}</strong></span>
          </div>
        </motion.div>
      </motion.div>
    </Container>
  );
};

export default AnalyticsPage;
