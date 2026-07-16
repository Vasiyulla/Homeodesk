import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import Container from '../components/Container';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Users, 
  Shield, 
  BarChart3, 
  Stethoscope,
  HeartPulse,
  Pill
} from 'lucide-react';

const AppHubPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const isAdminOrOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isClinical = user?.role === 'OWNER' || user?.role === 'DOCTOR' || user?.role === 'NURSE';
  const isAssistant = user?.role === 'ASSISTANT';
  const isPharmacyAllowed = user?.role === 'OWNER' || user?.role === 'DOCTOR' || user?.role === 'PHARMACIST' || user?.role === 'NURSE';

  const apps = [
    {
      id: 'clinical',
      title: 'Clinical Workspace',
      description: 'Patient cases, repertory, and symptom search.',
      icon: <Stethoscope className="w-8 h-8" />,
      color: 'from-blue-500 to-indigo-600',
      path: '/cases',
      visible: isClinical,
    },
    {
      id: 'crm',
      title: 'Intake & CRM',
      description: 'Manage patient directory and front-desk operations.',
      icon: <Users className="w-8 h-8" />,
      color: 'from-emerald-500 to-teal-600',
      path: '/patients',
      visible: isClinical || isAssistant,
    },

    {
      id: 'admin',
      title: 'System Administration',
      description: 'Staff, departments, billing, and system settings.',
      icon: <Shield className="w-8 h-8" />,
      color: 'from-slate-700 to-slate-900',
      path: '/admin',
      visible: isAdminOrOwner,
    },
    {
      id: 'pharmacy',
      title: 'Dispensary & Pharmacy',
      description: 'Manage medicine queues and dispense prescriptions.',
      icon: <Pill className="w-8 h-8" />,
      color: 'from-fuchsia-500 to-purple-600',
      path: '/pharmacy',
      visible: isPharmacyAllowed,
    },
    {
      id: 'analytics',
      title: 'Analytics & BI',
      description: 'Business intelligence, revenue, and clinic performance.',
      icon: <BarChart3 className="w-8 h-8" />,
      color: 'from-amber-500 to-orange-600',
      path: '/analytics',
      visible: isAdminOrOwner,
    },
  ];

  const visibleApps = apps.filter(app => app.visible);

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
    <div className="min-h-screen bg-surface-50 pt-12 pb-24">
      <Container>
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-5xl mx-auto">
          
          <div className="text-center mb-16">
            <motion.div variants={itemVariants} className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow mb-6">
              <Activity className="w-10 h-10 text-white" />
            </motion.div>
            <motion.h1 variants={itemVariants} className="text-4xl font-bold text-surface-900 mb-4">
              Welcome to the Hub, {user?.full_name || 'Practitioner'}
            </motion.h1>
            <motion.p variants={itemVariants} className="text-xl text-surface-500 max-w-2xl mx-auto">
              Select an app to open your workspace.
            </motion.p>
          </div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleApps.map((app) => (
              <button
                key={app.id}
                onClick={() => navigate(app.path)}
                className="group relative flex flex-col items-start p-8 text-left bg-white rounded-3xl border border-surface-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${app.color} rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity -translate-y-1/2 translate-x-1/2`} />
                
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {app.icon}
                </div>
                
                <h3 className="text-2xl font-bold text-surface-900 mb-2 relative z-10">
                  {app.title}
                </h3>
                <p className="text-surface-500 relative z-10 leading-relaxed h-12">
                  {app.description}
                </p>
                
                <div className="mt-8 flex items-center text-sm font-bold text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                  Open Workspace <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            ))}
          </motion.div>

        </motion.div>
      </Container>
    </div>
  );
};

export default AppHubPage;
