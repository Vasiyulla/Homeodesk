// Global State Store — Zustand with TypeScript
import { create } from 'zustand';
import type { User, Case, Decision, FollowUp, Symptom, ApiError } from '../types';

// ── Auth Store ──────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, isAuthenticated: false });
  },
}));

// ── Case Store ──────────────────────────────────────────────────────────────

interface CaseState {
  cases: Case[];
  currentCase: Case | null;
  isLoading: boolean;
  error: ApiError | null;
  setCases: (cases: Case[]) => void;
  setCurrentCase: (caseData: Case | null) => void;
  addCase: (newCase: Case) => void;
  updateCase: (caseId: string, updates: Partial<Case>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: ApiError | null) => void;
}

export const useCaseStore = create<CaseState>((set, get) => ({
  cases: [],
  currentCase: null,
  isLoading: false,
  error: null,

  setCases: (cases) => set({ cases }),
  setCurrentCase: (caseData) => set({ currentCase: caseData }),
  addCase: (newCase) => set({ cases: [...get().cases, newCase] }),
  updateCase: (caseId, updates) => {
    const cases = get().cases.map((c) =>
      c.id === caseId ? { ...c, ...updates } : c
    );
    const currentCase =
      get().currentCase?.id === caseId
        ? { ...get().currentCase!, ...updates }
        : get().currentCase;
    set({ cases, currentCase });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

// ── Decision Store ──────────────────────────────────────────────────────────

interface DecisionState {
  decisions: Decision[];
  isLoading: boolean;
  error: ApiError | null;
  setDecisions: (decisions: Decision[]) => void;
  addDecision: (decision: Decision) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: ApiError | null) => void;
}

export const useDecisionStore = create<DecisionState>((set, get) => ({
  decisions: [],
  isLoading: false,
  error: null,

  setDecisions: (decisions) => set({ decisions }),
  addDecision: (decision) => set({ decisions: [...get().decisions, decision] }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

// ── FollowUp Store ──────────────────────────────────────────────────────────

interface FollowUpState {
  followUps: FollowUp[];
  isLoading: boolean;
  error: ApiError | null;
  setFollowUps: (followUps: FollowUp[]) => void;
  addFollowUp: (followUp: FollowUp) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: ApiError | null) => void;
}

export const useFollowUpStore = create<FollowUpState>((set, get) => ({
  followUps: [],
  isLoading: false,
  error: null,

  setFollowUps: (followUps) => set({ followUps }),
  addFollowUp: (followUp) => set({ followUps: [...get().followUps, followUp] }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

// ── Symptom Store ───────────────────────────────────────────────────────────

interface SymptomState {
  symptoms: Symptom[];
  selectedSymptoms: Symptom[];
  isLoading: boolean;
  error: ApiError | null;
  setSymptoms: (symptoms: Symptom[]) => void;
  addSymptom: (symptom: Symptom) => void;
  removeSymptom: (symptom: Symptom) => void;
  clearSelectedSymptoms: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: ApiError | null) => void;
}

export const useSymptomStore = create<SymptomState>((set) => ({
  symptoms: [],
  selectedSymptoms: [],
  isLoading: false,
  error: null,

  setSymptoms: (symptoms) => set({ symptoms }),
  addSymptom: (symptom) =>
    set((state) => ({
      selectedSymptoms: [...state.selectedSymptoms, symptom],
    })),
  removeSymptom: (symptom) =>
    set((state) => ({
      selectedSymptoms: state.selectedSymptoms.filter((s) => s.id !== symptom.id),
    })),
  clearSelectedSymptoms: () => set({ selectedSymptoms: [] }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

// ── Notification Store ──────────────────────────────────────────────────────

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id'>) => void;
  removeNotification: (id: number) => void;
}

let notificationIdCounter = 0;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  addNotification: (n) => {
    const id = ++notificationIdCounter;
    set({ notifications: [...get().notifications, { ...n, id }] });
    // Auto-remove after duration
    const duration = n.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        set({ notifications: get().notifications.filter(item => item.id !== id) });
      }, duration);
    }
  },
  removeNotification: (id) => {
    set({ notifications: get().notifications.filter(n => n.id !== id) });
  },
}));

// ── UI Store ────────────────────────────────────────────────────────────────

interface UiState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
}));

