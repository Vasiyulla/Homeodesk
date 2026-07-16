import React from 'react';
import type { RubricEntry, RemedyDetail } from '../../services/repertoryBrowserApi';
import { ChevronRight, Check } from 'lucide-react';

interface RemedyGridPaneProps {
  chapter: string | null;
  rubric: RubricEntry | null;
  remedies: RemedyDetail[];
  isLoading: boolean;
  caseMode?: boolean;
  selectedForCase?: Set<string>;
  onToggleForCase?: (remedyName: string) => void;
}

const getGradeColor = (grade: number) => {
  switch (grade) {
    case 4: return 'bg-rose-50 border-rose-200 text-rose-700'; // Red
    case 3: return 'bg-amber-50 border-amber-200 text-amber-700'; // Orange
    case 2: return 'bg-sky-50 border-sky-200 text-sky-700'; // Blue
    default: return 'bg-surface-50 border-surface-200 text-surface-600'; // Grey
  }
};

const RemedyGridPane: React.FC<RemedyGridPaneProps> = ({
  chapter,
  rubric,
  remedies,
  isLoading,
  caseMode = false,
  selectedForCase = new Set(),
  onToggleForCase,
}) => {
  if (!chapter || !rubric) {
    return (
      <div className="flex-1 bg-surface-50/30 flex items-center justify-center text-surface-400">
        <p>Select a rubric to view associated remedies</p>
      </div>
    );
  }

  // Group by grade for display, but keep them sorted or just display them straight.
  // The screenshot shows them sorted by grade descending.
  const sortedRemedies = [...remedies].sort((a, b) => b.grade - a.grade);

  return (
    <div className="flex-1 bg-white flex flex-col h-full min-w-0">
      <div className="p-6 border-b border-surface-200">
        <div className="flex items-center text-sm text-surface-500 mb-2">
          <span>{chapter}</span>
          <ChevronRight className="w-4 h-4 mx-1" />
        </div>
        <h2 className="text-2xl font-bold text-surface-900 leading-tight">
          {rubric.main_rubric}
        </h2>
        {rubric.sub_condition && (
          <p className="text-surface-500 mt-1">{rubric.sub_condition}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-surface-600 uppercase tracking-wider">
            Associated Remedies ({remedies.length})
          </h3>
          <div className="flex items-center gap-3 text-xs font-medium text-surface-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Gr. 4</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Gr. 3</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500"></span> Gr. 2</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-surface-400"></span> Gr. 1</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {sortedRemedies.map((remedy, idx) => (
              <div
                key={`${remedy.name}-${idx}`}
                onClick={() => caseMode && onToggleForCase?.(remedy.name.replace('.', ''))}
                className={`relative p-3 rounded-lg border flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02] cursor-pointer shadow-sm ${getGradeColor(remedy.grade)} ${
                  caseMode && selectedForCase.has(remedy.name.replace('.', '')) ? 'ring-2 ring-emerald-400' : ''
                }`}
              >
                {caseMode && selectedForCase.has(remedy.name.replace('.', '')) && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}
                <span className="font-bold text-sm mb-1">{remedy.name.replace('.', '')}</span>
                <span className="text-[10px] opacity-80 font-medium">Grade {remedy.grade}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RemedyGridPane;
