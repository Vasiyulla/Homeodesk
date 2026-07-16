import React, { useEffect, useState } from 'react';
import { useRepertoryStore } from '../../store/repertoryStore';
import { repertoryApi, RemedyScore } from '../../services/repertoryApi';
import { X, Calculator, Trash2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const RepertorizationGrid: React.FC<Props> = ({ onClose }) => {
  const clipboard = useRepertoryStore((state) => state.clipboard);
  const clearClipboard = useRepertoryStore((state) => state.clearClipboard);
  const removeRubric = useRepertoryStore((state) => state.removeRubric);

  const [scores, setScores] = useState<RemedyScore[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const repertorize = async () => {
      if (clipboard.length === 0) {
        setScores([]);
        return;
      }
      setLoading(true);
      const res = await repertoryApi.repertorize(clipboard);
      if (res.success && res.data) {
        setScores(res.data);
      }
      setLoading(false);
    };
    
    repertorize();
  }, [clipboard]);

  // Display top 20 remedies
  const displayScores = scores.slice(0, 20);

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-4 border-b border-surface-200 flex items-center justify-between shrink-0 bg-surface-50">
        <div className="flex items-center gap-3">
          <Calculator className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-bold text-surface-900">Repertorization Grid</h2>
          <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-medium">
            {clipboard.length} Rubrics
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearClipboard}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-surface-400 hover:bg-surface-200 hover:text-surface-600 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-surface-50 p-6">
        {clipboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-surface-400">
            <Calculator className="w-12 h-12 mb-4 opacity-20" />
            <p>Your clipboard is empty.</p>
            <p className="text-sm">Add rubrics from the repertory to see the grid.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-surface-700 bg-surface-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 min-w-[250px] font-semibold sticky left-0 bg-surface-100 border-r border-surface-200 z-20">
                      Selected Rubrics
                    </th>
                    {displayScores.map((score, i) => (
                      <th key={i} className="px-2 py-3 text-center min-w-[48px] font-bold text-brand-700 border-b-2 border-brand-500">
                        <div className="writing-vertical-lr transform rotate-180 mb-2 h-[80px]">
                          {score.remedy}
                        </div>
                        <div className="text-[10px] text-surface-500 font-normal">
                          {score.total_score}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {clipboard.map((rubric, rIdx) => {
                    const rubricId = `${rubric.chapter} | ${rubric.main_rubric}${rubric.sub_condition ? ` | ${rubric.sub_condition}` : ''}`;
                    
                    return (
                      <tr key={rIdx} className="hover:bg-brand-50/30 transition-colors group">
                        <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-brand-50/30 border-r border-surface-200 z-10">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase text-surface-400 font-bold tracking-wider block mb-0.5">
                                {rubric.chapter}
                              </span>
                              <span className="text-surface-900 font-medium">
                                {rubric.main_rubric}
                              </span>
                              {rubric.sub_condition && (
                                <span className="text-surface-500 ml-1">
                                  - {rubric.sub_condition}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeRubric(rIdx)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-surface-400 hover:text-red-500 rounded hover:bg-red-50 transition-all"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        {displayScores.map((score, cIdx) => {
                          let grade = 0;
                          for (const obj of score.rubrics_covered) {
                            if (obj[rubricId] !== undefined) {
                              grade = obj[rubricId];
                              break;
                            }
                          }

                          return (
                            <td key={cIdx} className="px-2 py-3 text-center border-l border-surface-50">
                              {grade > 0 && (
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${
                                  grade === 3 ? 'bg-red-100 text-red-700' :
                                  grade === 2 ? 'bg-blue-100 text-blue-700 italic' :
                                  'bg-surface-100 text-surface-700'
                                }`}>
                                  {grade}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepertorizationGrid;
