import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/store';
import { authApi } from './services/authApi';
import { Capacitor } from '@capacitor/core';
import { initDatabase } from './services/local/database';
import { ensureDefaultUser } from './services/local/authLocal';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import NotificationProvider from './components/NotificationProvider';
import {
  LoginPage,
  DoctorDashboard,
  CasesListPage,
  CreateCasePage,
  CaseDetailPage,
  AddDecisionPage,
  AddFollowUpPage,
  SymptomSearchPage,
  AdminDashboardPage,
  AssistantDashboardPage,
  AnalyticsPage,
  PatientsPage,
  AuditLogPage,
  AppHubPage,
  RepertoryBrowserPage,
  PharmacyPage,
  AppointmentsPage,
  WaitingRoomPage,
  BodyMapPage,
} from './pages';
import LoadingSpinner from './components/LoadingSpinner';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && user.role && !allowedRoles.includes(user.role)) {
    // If user has a role but it's not allowed, redirect to a safe default
    return <Navigate to="/" replace />;
  }

  // Always render the sidebar on mobile so the menu works. 
  // On desktop, we can hide it for the true "AppHubPage" if we wanted, but since DoctorDashboard is at '/', we definitely need it.
  const isAppHub = location.pathname === '/hub_special'; // Not used, so we always show sidebar

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden transition-all duration-300 lg:ml-64">
        <TopBar />
        <div className="flex-1 overflow-y-auto page-enter">
          <div className="min-h-full p-4 md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const { setUser, isAuthenticated, user } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        const isNative = Capacitor.isNativePlatform();
        if (isNative) {
          console.log('[App] Initializing SQLite database...');
          await initDatabase();
          console.log('[App] Database initialized. Ensuring default admin...');
          await ensureDefaultUser();
        }

        const token = localStorage.getItem('access_token');
        if (token) {
          try {
            const result = await authApi.getProfile();
            if (result.success && result.data) {
              setUser(result.data);
            } else {
              localStorage.removeItem('access_token');
            }
          } catch (error) {
            localStorage.removeItem('access_token');
          }
        }
      } catch (err: any) {
        console.error('[App] Initialization error:', err);
        setInitError(err?.message || 'Database failed to load.');
      } finally {
        setIsInitializing(false);
      }
    };

    initApp();
  }, [setUser]);


  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-surface-50">
        <LoadingSpinner size="lg" text="Starting Homeopathy Case Manager..." />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-surface-50 p-6 text-center">
        <div className="max-w-md bg-white border border-red-200 rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Failed to Start App</h2>
          <p className="text-gray-600 mb-4">{initError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Determine homepage based on role
  const getDashboardByRole = () => {
    if (!user) return <AppHubPage />;
    if (user.role === 'ASSISTANT') return <AssistantDashboardPage />;
    if (user.role === 'DOCTOR' || user.role === 'OWNER') return <DoctorDashboard title="Doctor Dashboard" />;
    if (user.role === 'ADMIN') return <AdminDashboardPage />;
    return <AppHubPage />;
  };

  return (
    <NotificationProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<ProtectedRoute>{getDashboardByRole()}</ProtectedRoute>} />
        
        {/* Role-Specific Dashboards */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN', 'OWNER']}><AdminDashboardPage /></ProtectedRoute>} />
        <Route path="/assistant" element={<ProtectedRoute allowedRoles={['ASSISTANT']}><AssistantDashboardPage /></ProtectedRoute>} />

        <Route path="/pharmacy" element={<ProtectedRoute allowedRoles={['PHARMACIST', 'NURSE', 'DOCTOR', 'OWNER']}><PharmacyPage /></ProtectedRoute>} />
        <Route path="/doctor" element={<ProtectedRoute allowedRoles={['DOCTOR', 'OWNER']}><DoctorDashboard title="Doctor Dashboard" /></ProtectedRoute>} />

        <Route path="/cases" element={<ProtectedRoute allowedRoles={['DOCTOR', 'OWNER', 'NURSE']}><CasesListPage /></ProtectedRoute>} />
        <Route path="/cases/new" element={<ProtectedRoute allowedRoles={['DOCTOR', 'OWNER', 'NURSE']}><CreateCasePage /></ProtectedRoute>} />
        <Route path="/cases/:caseId" element={<ProtectedRoute allowedRoles={['DOCTOR', 'OWNER', 'NURSE']}><CaseDetailPage /></ProtectedRoute>} />
        <Route path="/cases/:caseId/add-decision" element={<ProtectedRoute allowedRoles={['DOCTOR', 'OWNER']}><AddDecisionPage /></ProtectedRoute>} />
        <Route path="/cases/:caseId/add-followup" element={<ProtectedRoute allowedRoles={['DOCTOR', 'OWNER', 'NURSE']}><AddFollowUpPage /></ProtectedRoute>} />
        
        <Route path="/repertory" element={<ProtectedRoute allowedRoles={['DOCTOR', 'OWNER']}><RepertoryBrowserPage /></ProtectedRoute>} />
        <Route path="/symptoms" element={<ProtectedRoute allowedRoles={['DOCTOR', 'OWNER']}><SymptomSearchPage /></ProtectedRoute>} />
        <Route path="/body-map" element={<ProtectedRoute allowedRoles={['DOCTOR', 'OWNER']}><BodyMapPage /></ProtectedRoute>} />
        
        {/* Sprint 2 — New Pages */}
        <Route path="/patients" element={<ProtectedRoute allowedRoles={['DOCTOR', 'OWNER', 'NURSE', 'ASSISTANT']}><PatientsPage /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute allowedRoles={['DOCTOR', 'OWNER', 'NURSE', 'ASSISTANT']}><AppointmentsPage /></ProtectedRoute>} />
        <Route path="/waiting-room" element={<ProtectedRoute allowedRoles={['DOCTOR', 'OWNER', 'NURSE']}><WaitingRoomPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute allowedRoles={['ADMIN', 'OWNER']}><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['ADMIN', 'OWNER']}><AuditLogPage /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NotificationProvider>
  );
};

export default App;
