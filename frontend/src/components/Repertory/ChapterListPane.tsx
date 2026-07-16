import React, { useState } from 'react';
import { Search } from 'lucide-react';
import type { RubricEntry } from '../../services/repertoryBrowserApi';

interface ChapterListPaneProps {
  chapters: string[];
  selectedChapter: string | null;
  onSelectChapter: (chapter: string) => void;
  isLoading: boolean;
}

const ChapterListPane: React.FC<ChapterListPaneProps> = ({
  chapters,
  selectedChapter,
  onSelectChapter,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<'Rubrics' | 'Remedies'>('Rubrics');

  const filteredChapters = chapters.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-72 border-r border-surface-200 bg-white flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-surface-200 space-y-4">
        <div className="flex bg-surface-100 p-1 rounded-lg">
          <button
            onClick={() => setTab('Rubrics')}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${tab === 'Rubrics' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-900'}`}
          >
            Rubrics
          </button>
          <button
            onClick={() => setTab('Remedies')}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${tab === 'Remedies' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-900'}`}
          >
            Remedies
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search rubrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2 px-3">
            Chapters
          </p>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filteredChapters.map(chapter => (
                <li key={chapter}>
                  <button
                    onClick={() => onSelectChapter(chapter)}
                    className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors flex items-center justify-between ${
                      selectedChapter === chapter
                        ? 'bg-brand-50 text-brand-700 font-medium'
                        : 'text-surface-700 hover:bg-surface-50'
                    }`}
                  >
                    <span className="truncate">{chapter}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChapterListPane;
