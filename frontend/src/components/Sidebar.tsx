import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useUiStore } from '../store/store';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Search,
  Activity,
  UserPlus,
  BarChart3,
  Shield,
  PlusCircle,
  Pill,
  X,
  User,
  CalendarDays,
  Clock,
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const { isSidebarOpen, setSidebarOpen } = useUiStore();
  const navigate = useNavigate();

  const clinicType = user?.organization_clinic_type || 'Hospital';
  const isSinglePerson = clinicType === 'Single-person Clinic';
  
  // Single-person clinics do not get the complex admin module
  const isAdminOrOwner = !isSinglePerson && (user?.role === 'OWNER' || user?.role === 'ADMIN');

  const clinicalItems = [
    { to: '/cases', icon: <Users className="w-5 h-5" />, label: 'My Cases', roles: ['DOCTOR', 'OWNER', 'NURSE'] },
    { to: '/repertory', icon: <Activity className="w-5 h-5" />, label: 'Repertory', roles: ['DOCTOR', 'OWNER'] },
    { to: '/symptoms', icon: <Search className="w-5 h-5" />, label: 'Symptom Search', roles: ['DOCTOR', 'OWNER'] },
    { to: '/body-map', icon: <User className="w-5 h-5" />, label: 'Body Map', roles: ['DOCTOR', 'OWNER'] },
    { to: '/pharmacy', icon: <Pill className="w-5 h-5" />, label: 'Dispensary', roles: ['DOCTOR', 'OWNER', 'PHARMACIST', 'NURSE'] },
  ].filter(item => !item.roles || (user && user.role && item.roles.includes(user.role)));

  const crmItems = [
    { to: '/patients', icon: <UserPlus className="w-5 h-5" />, label: 'Patient Directory', roles: ['DOCTOR', 'OWNER', 'NURSE', 'ASSISTANT'] },
    { to: '/appointments', icon: <CalendarDays className="w-5 h-5" />, label: 'Appointments', roles: ['DOCTOR', 'OWNER', 'NURSE', 'ASSISTANT'] },
    { to: '/waiting-room', icon: <Clock className="w-5 h-5" />, label: 'Waiting Room', roles: ['DOCTOR', 'OWNER', 'NURSE'] },
  ].filter(item => !item.roles || (user && user.role && item.roles.includes(user.role)));

  const adminNavItems = [
    { to: '/admin', icon: <Shield className="w-5 h-5" />, label: 'System Settings' },
  ];
  
  if (clinicType === 'Hospital') {
    adminNavItems.push({ to: '/analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics & BI' });
    adminNavItems.push({ to: '/audit-logs', icon: <Shield className="w-5 h-5" />, label: 'Security Audit' });
  } else if (clinicType === 'Polyclinic') {
    adminNavItems.push({ to: '/analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics' });
  }

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`w-64 h-screen fixed left-0 top-0 bg-white/95 backdrop-blur-xl border-r border-surface-200 shadow-glass flex flex-col z-40 transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-surface-200 bg-white/50">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { navigate('/'); handleNavClick(); }}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-surface-900 leading-tight">
                {user?.organization_name || 'Homeopathy'}
              </h1>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-surface-100 rounded-lg text-surface-500 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          
          {clinicalItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="mb-4 px-2">
                <button
                  onClick={() => { navigate('/cases/new'); handleNavClick(); }}
                  className="w-full btn-primary !py-2.5 shadow-glow"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  New Case
                </button>
              </div>
              <p className="px-3 text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                Clinical Workspace
              </p>
              {clinicalItems.map((item) => (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-link relative ${isActive ? 'active' : ''}`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div layoutId="activeNavIndicator" className="absolute left-0 w-1 h-6 bg-brand-600 rounded-r-full" initial={false} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                      )}
                      {item.icon}
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}

          {crmItems.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-3 text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                Intake & CRM
              </p>
              {crmItems.map((item) => (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-link relative ${isActive ? 'active' : ''}`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div layoutId="activeNavIndicator" className="absolute left-0 w-1 h-6 bg-brand-600 rounded-r-full" initial={false} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                      )}
                      {item.icon}
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}

          {isAdminOrOwner && adminNavItems.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-3 text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                System Administration
              </p>
              {adminNavItems.map((item) => (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-link relative ${isActive ? 'active' : ''}`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div layoutId="activeNavIndicator" className="absolute left-0 w-1 h-6 bg-brand-600 rounded-r-full" initial={false} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                      )}
                      {item.icon}
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
