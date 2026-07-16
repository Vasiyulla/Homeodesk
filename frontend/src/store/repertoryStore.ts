import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { SelectedRubric } from '../services/repertoryApi';

interface RepertoryState {
  clipboard: SelectedRubric[];
  
  // Actions
  addRubric: (rubric: SelectedRubric) => void;
  removeRubric: (index: number) => void;
  clearClipboard: () => void;
}

export const useRepertoryStore = create<RepertoryState>()(
  devtools(
    persist(
      (set) => ({
        clipboard: [],

        addRubric: (rubric) =>
          set((state) => {
            // Check for duplicates
            const exists = state.clipboard.some(
              (r) =>
                r.chapter === rubric.chapter &&
                r.main_rubric === rubric.main_rubric &&
                r.sub_condition === rubric.sub_condition
            );
            if (exists) return state;
            
            return { clipboard: [...state.clipboard, rubric] };
          }),

        removeRubric: (index) =>
          set((state) => ({
            clipboard: state.clipboard.filter((_, i) => i !== index),
          })),

        clearClipboard: () => set({ clipboard: [] }),
      }),
      { name: 'RepertoryClipboard' }
    ),
    { name: 'RepertoryStore' }
  )
);
