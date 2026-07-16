import React, { useState } from 'react';
import { Search, Check } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import Badge from '../Badge';

interface RemedyIndexListPaneProps {
  remedies: string[];
  selectedRemedy: string | null;
  onSelectRemedy: (remedy: string) => void;
  isLoading: boolean;
  caseMode?: boolean;
  selectedForCase?: Set<string>;
}

const RemedyIndexListPane: React.FC<RemedyIndexListPaneProps> = ({
  remedies,
  selectedRemedy,
  onSelectRemedy,
  isLoading,
  caseMode = false,
  selectedForCase = new Set(),
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRemedies = remedies.filter((rem) =>
    rem.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-80 flex-shrink-0 flex flex-col border-r border-surface-200 bg-white">
      <div className="p-4 border-b border-surface-200">
        <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-3">
          Remedy Index
        </h2>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search remedy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <LoadingSpinner size="sm" text="Loading remedies..." />
          </div>
        ) : (
          <div className="py-2">
            {filteredRemedies.length > 0 ? (
              <ul className="space-y-0.5 px-2">
                {filteredRemedies.map((remedy, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => onSelectRemedy(remedy)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between ${
                        caseMode && selectedForCase.has(remedy)
                          ? 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-200'
                          : selectedRemedy === remedy
                          ? 'bg-brand-50 text-brand-700 font-medium'
                          : 'text-surface-700 hover:bg-surface-50 hover:text-surface-900'
                      }`}
                    >
                      <span>{remedy}</span>
                      {caseMode && selectedForCase.has(remedy) && (
                        <span className="shrink-0 ml-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center p-8 text-surface-400 text-sm">
                {searchTerm ? 'No remedies found.' : 'No remedies available.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RemedyIndexListPane;
