import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useUiStore } from '../store/store';
import { Menu, LogOut, User as UserIcon, Grid, Activity, Users, Shield, Settings, ChevronDown, Mail, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from './NotificationBell';

const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUiStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getModuleName = () => {
    const path = location.pathname;
    if (path === '/') return 'Clinic Hub';
    if (path.startsWith('/cases') || path.startsWith('/symptoms') || path.startsWith('/repertory')) return 'Clinical (HIS)';
    if (path.startsWith('/patients')) return 'Intake & CRM';
    if (path.startsWith('/admin') || path.startsWith('/audit-logs')) return 'System Administration';
    if (path.startsWith('/analytics')) return 'Analytics & BI';

    return 'Homeopathy App';
  };

  const isAdminOrOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isClinical = user?.role === 'OWNER' || user?.role === 'DOCTOR' || user?.role === 'NURSE';
  const isAssistant = user?.role === 'ASSISTANT';

  return (
    <div className="h-16 border-b border-surface-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 z-30 sticky top-0 shadow-sm w-full">
      
      {/* Left section: App Switcher & Context */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-surface-100 rounded-lg text-surface-600 transition-colors lg:hidden"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative hidden lg:block">
          <button 
            onClick={() => setShowAppSwitcher(!showAppSwitcher)}
            className="p-2 hover:bg-surface-100 rounded-lg text-surface-600 transition-colors"
          >
            <Grid className="w-5 h-5" />
          </button>
          
          <AnimatePresence>
            {showAppSwitcher && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAppSwitcher(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-12 left-0 w-64 bg-white border border-surface-200 rounded-2xl shadow-xl z-50 p-4 grid grid-cols-2 gap-2"
                >
                  <button onClick={() => { navigate('/'); setShowAppSwitcher(false); }} className="p-3 text-center hover:bg-surface-50 rounded-xl transition-colors">
                    <Grid className="w-6 h-6 mx-auto mb-2 text-brand-600" />
                    <span className="text-xs font-semibold text-surface-700">Clinic Hub</span>
                  </button>
                  {isClinical && (
                    <button onClick={() => { navigate('/cases'); setShowAppSwitcher(false); }} className="p-3 text-center hover:bg-surface-50 rounded-xl transition-colors">
                      <Activity className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                      <span className="text-xs font-semibold text-surface-700">Clinical</span>
                    </button>
                  )}
                  {(isClinical || isAssistant) && (
                    <button onClick={() => { navigate('/patients'); setShowAppSwitcher(false); }} className="p-3 text-center hover:bg-surface-50 rounded-xl transition-colors">
                      <Users className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                      <span className="text-xs font-semibold text-surface-700">CRM</span>
                    </button>
                  )}
                  {isAdminOrOwner && (
                    <button onClick={() => { navigate('/admin'); setShowAppSwitcher(false); }} className="p-3 text-center hover:bg-surface-50 rounded-xl transition-colors">
                      <Shield className="w-6 h-6 mx-auto mb-2 text-slate-700" />
                      <span className="text-xs font-semibold text-surface-700">Admin</span>
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="h-6 w-px bg-surface-200"></div>

        <div>
          <h2 className="text-sm font-bold text-surface-900">{getModuleName()}</h2>
        </div>
      </div>

      {/* Right section: Profile */}
      <div className="flex items-center gap-4">
        <NotificationBell />
        
        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 pl-4 border-l border-surface-200 hover:bg-surface-50 p-2 rounded-xl transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-surface-900 leading-tight">
                {user?.full_name || 'Dr. User'}
              </p>
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">{user?.role || 'Practitioner'}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center border border-brand-200">
              <UserIcon className="w-5 h-5 text-brand-700" />
            </div>
            <ChevronDown className={`w-4 h-4 text-surface-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-14 right-0 w-72 bg-white border border-surface-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-4 bg-surface-50 border-b border-surface-200">
                    <p className="font-bold text-surface-900">{user?.full_name}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-surface-500">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{user?.email}</span>
                    </div>
                    {user?.organization_name && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-surface-500">
                        <Building className="w-3.5 h-3.5" />
                        <span className="truncate">{user.organization_name}</span>
                      </div>
                    )}
                  </div>
                  
                  
                  {isAdminOrOwner && (
                    <div className="p-2">
                      <button 
                        onClick={() => { navigate('/admin'); setShowProfileMenu(false); }}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-100 rounded-xl transition-colors"
                      >
                        <Settings className="w-4 h-4 text-surface-400" />
                        Account Settings
                      </button>
                    </div>
                  )}
                  
                  <div className="p-2 border-t border-surface-200">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
};

export default TopBar;
