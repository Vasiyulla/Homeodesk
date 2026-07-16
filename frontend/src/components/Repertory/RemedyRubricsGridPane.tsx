import React from 'react';
import Badge from '../Badge';
import LoadingSpinner from '../LoadingSpinner';
import { RemedyRubricResult } from '../../services/repertoryBrowserApi';
import { Check, PlusCircle } from 'lucide-react';

interface RemedyRubricsGridPaneProps {
  remedy: string | null;
  rubrics: RemedyRubricResult[];
  isLoading: boolean;
  caseMode?: boolean;
  selectedForCase?: Set<string>;
  onToggleForCase?: (remedyName: string) => void;
}

const RemedyRubricsGridPane: React.FC<RemedyRubricsGridPaneProps> = ({
  remedy,
  rubrics,
  isLoading,
  caseMode = false,
  selectedForCase = new Set(),
  onToggleForCase,
}) => {
  if (!remedy) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-50 text-surface-400">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
          <span className="text-2xl">🌱</span>
        </div>
        <p>Select a remedy to view its rubrics</p>
      </div>
    );
  }

  const getGradeColor = (grade: number) => {
    switch (grade) {
      case 4:
        return 'bg-red-50 text-red-700 border-red-200';
      case 3:
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 2:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 1:
        return 'bg-surface-100 text-surface-700 border-surface-200';
      default:
        return 'bg-surface-100 text-surface-700 border-surface-200';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-50 min-w-0">
      <div className="p-4 border-b border-surface-200 bg-white shadow-sm shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-surface-900">{remedy}</h2>
            <p className="text-sm text-surface-500">
              Found in {rubrics.length} rubrics
            </p>
          </div>
          {caseMode && remedy && (
            <button
              onClick={() => onToggleForCase?.(remedy)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                selectedForCase.has(remedy)
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
              }`}
            >
              {selectedForCase.has(remedy) ? (
                <><Check className="w-4 h-4" /> Selected</>
              ) : (
                <><PlusCircle className="w-4 h-4" /> Add to Case</>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <LoadingSpinner size="lg" text="Loading rubrics..." />
          </div>
        ) : rubrics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rubrics.map((r, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                    {r.chapter}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
                      r.grade === 3 ? 'bg-red-100 text-red-700' :
                      r.grade === 2 ? 'bg-blue-100 text-blue-700 italic' :
                      'bg-surface-100 text-surface-700'
                    }`}>
                      {r.grade}
                    </span>
                    {r.source && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        r.source.toLowerCase() === 'kent' ? 'text-blue-600 bg-blue-50' :
                        r.source.toLowerCase() === 'boger' ? 'text-purple-600 bg-purple-50' :
                        'text-surface-600 bg-surface-100'
                      }`}>
                        {r.source}
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-surface-900 leading-snug">
                  {r.main_rubric}
                </h3>
                {r.sub_condition && (
                  <p className="text-sm text-surface-600 mt-1">
                    {r.sub_condition}
                  </p>
                )}
                <div className="mt-3 flex justify-end">
                  <Badge variant="neutral">{r.source}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 text-surface-400">
            No rubrics found for this remedy.
          </div>
        )}
      </div>
    </div>
  );
};

export default RemedyRubricsGridPane;
