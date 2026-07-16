import React from 'react';
import type { RubricEntry } from '../../services/repertoryBrowserApi';
import { Plus } from 'lucide-react';
import { useRepertoryStore } from '../../store/repertoryStore';

interface RubricListPaneProps {
  chapter: string | null;
  rubrics: RubricEntry[];
  selectedRubric: RubricEntry | null;
  onSelectRubric: (rubric: RubricEntry) => void;
  isLoading: boolean;
}

const RubricListPane: React.FC<RubricListPaneProps> = ({
  chapter,
  rubrics,
  selectedRubric,
  onSelectRubric,
  isLoading
}) => {
  if (!chapter) {
    return (
      <div className="w-[400px] border-r border-surface-200 bg-surface-50/50 flex flex-col h-full shrink-0 items-center justify-center text-surface-400">
        <p>Select a chapter to view rubrics</p>
      </div>
    );
  }

  return (
    <div className="w-[400px] border-r border-surface-200 bg-white flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-surface-200 flex items-center gap-3">
        <h2 className="text-lg font-bold text-surface-900">{chapter}</h2>
        <span className="px-2 py-0.5 rounded-full bg-surface-100 text-surface-600 text-xs font-medium">
          {rubrics.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rubrics.length === 0 ? (
          <div className="p-8 text-center text-surface-400">
            <p>No rubrics found in this chapter.</p>
          </div>
        ) : (
          <ul className="divide-y divide-surface-100">
            {rubrics.map((rubric, idx) => {
              const isSelected = 
                selectedRubric?.main_rubric === rubric.main_rubric && 
                selectedRubric?.sub_condition === rubric.sub_condition;

              return (
                <li key={`${rubric.main_rubric}-${rubric.sub_condition}-${idx}`}>
                  <div className={`w-full text-left p-4 hover:bg-surface-50 transition-colors flex items-start justify-between group ${
                      isSelected ? 'bg-brand-50/50' : ''
                    }`}>
                    <button
                      onClick={() => onSelectRubric(rubric)}
                      className="flex-1 text-left"
                    >
                      <h3 className="text-sm font-semibold text-surface-900 leading-snug">
                        {rubric.main_rubric}
                      </h3>
                      {rubric.sub_condition && (
                        <p className="text-sm text-surface-500 mt-0.5">
                          {rubric.sub_condition}
                        </p>
                      )}
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {rubric.source && (
                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          rubric.source.toLowerCase() === 'kent' ? 'text-blue-600 bg-blue-50' :
                          rubric.source.toLowerCase() === 'boger' ? 'text-purple-600 bg-purple-50' :
                          'text-surface-600 bg-surface-100'
                        }`}>
                          {rubric.source}
                        </span>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          useRepertoryStore.getState().addRubric({
                            chapter: chapter,
                            main_rubric: rubric.main_rubric,
                            sub_condition: rubric.sub_condition,
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 bg-brand-100 text-brand-700 hover:bg-brand-200 rounded transition-all"
                        title="Add to Repertorization Clipboard"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RubricListPane;
