import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ChapterListPane from '../components/Repertory/ChapterListPane';
import RubricListPane from '../components/Repertory/RubricListPane';
import RemedyGridPane from '../components/Repertory/RemedyGridPane';
import RemedyIndexListPane from '../components/Repertory/RemedyIndexListPane';
import RemedyRubricsGridPane from '../components/Repertory/RemedyRubricsGridPane';
import { repertoryBrowserApi, RubricEntry, RemedyDetail, RemedyRubricResult } from '../services/repertoryBrowserApi';
import { caseApi } from '../services/caseApi';
import { useCaseStore } from '../store/store';
import ErrorAlert from '../components/ErrorAlert';
import { HelpCircle, ArrowLeft, Pill, Check, X, Calculator } from 'lucide-react';
import RepertorizationGrid from '../components/Repertory/RepertorizationGrid';
import { useRepertoryStore } from '../store/repertoryStore';

const RepertoryBrowserPage: React.FC = () => {
  const clipboard = useRepertoryStore((state) => state.clipboard);
  const [showGrid, setShowGrid] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const caseId = searchParams.get('caseId');
  const { currentCase, updateCase: updateCaseInStore } = useCaseStore();
  const [viewMode, setViewMode] = useState<'repertory' | 'remedy'>(caseId ? 'remedy' : 'repertory');
  const [isSavingToCase, setIsSavingToCase] = useState(false);

  // Multi-select state for case mode
  const [selectedForCase, setSelectedForCase] = useState<Set<string>>(new Set());

  // Pre-load existing remedies from the case so we can merge
  useEffect(() => {
    if (caseId && currentCase && currentCase.remedy_name) {
      const existing = currentCase.remedy_name.split(',').map((r: string) => r.trim()).filter(Boolean);
      setSelectedForCase(new Set(existing));
    }
  }, [caseId, currentCase]);

  // Repertory View State
  const [chapters, setChapters] = useState<string[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  const [sourceFilter, setSourceFilter] = useState<'both' | 'kent' | 'boger'>('both');

  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [rubrics, setRubrics] = useState<RubricEntry[]>([]);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(false);

  const [selectedRubric, setSelectedRubric] = useState<RubricEntry | null>(null);
  const [remedies, setRemedies] = useState<RemedyDetail[]>([]);
  const [isLoadingRemedies, setIsLoadingRemedies] = useState(false);

  // Remedy Index View State
  const [allRemedies, setAllRemedies] = useState<string[]>([]);
  const [isLoadingAllRemedies, setIsLoadingAllRemedies] = useState(false);
  const [selectedRemedy, setSelectedRemedy] = useState<string | null>(null);
  const [remedyRubrics, setRemedyRubrics] = useState<RemedyRubricResult[]>([]);
  const [isLoadingRemedyRubrics, setIsLoadingRemedyRubrics] = useState(false);

  const [apiError, setApiError] = useState<{ message: string } | null>(null);

  useEffect(() => {
    const fetchChapters = async () => {
      setIsLoadingChapters(true);
      const res = await repertoryBrowserApi.getChapters();
      if (res.success && res.data) {
        setChapters(res.data.sections);
      } else {
        setApiError({ message: 'Failed to load chapters' });
      }
      setIsLoadingChapters(false);
    };

    const fetchAllRemedies = async () => {
      setIsLoadingAllRemedies(true);
      const res = await repertoryBrowserApi.getRemedies();
      if (res.success && res.data) {
        setAllRemedies(res.data.remedies);
      } else {
        setApiError({ message: 'Failed to load remedies' });
      }
      setIsLoadingAllRemedies(false);
    };

    fetchChapters();
    fetchAllRemedies();
  }, []);

  const handleSelectChapter = async (chapter: string) => {
    setSelectedChapter(chapter);
    setSelectedRubric(null);
    setRemedies([]);
    setIsLoadingRubrics(true);
    
    const res = await repertoryBrowserApi.getRubricsByChapter(chapter, sourceFilter === 'both' ? undefined : sourceFilter);
    if (res.success && res.data) {
      setRubrics(res.data.rubrics);
    } else {
      setApiError({ message: 'Failed to load rubrics' });
    }
    
    setIsLoadingRubrics(false);
  };

  // Re-fetch rubrics when sourceFilter changes if a chapter is selected
  useEffect(() => {
    if (selectedChapter) {
      handleSelectChapter(selectedChapter);
    }
    if (selectedRemedy) {
      handleSelectRemedy(selectedRemedy);
    }
  }, [sourceFilter]);

  const handleSelectRubric = async (rubric: RubricEntry) => {
    setSelectedRubric(rubric);
    setIsLoadingRemedies(true);
    
    if (selectedChapter) {
      const res = await repertoryBrowserApi.getExactRubric(
        selectedChapter,
        rubric.main_rubric,
        rubric.sub_condition,
        sourceFilter === 'both' ? undefined : sourceFilter
      );
      if (res.success && res.data && res.data.results.length > 0) {
        // Find the first result (usually only one for exact match)
        setRemedies(res.data.results[0].remedies);
      } else {
        setRemedies([]);
        setApiError({ message: 'Failed to load remedies' });
      }
    }
    
    setIsLoadingRemedies(false);
  };

  const handleSelectRemedy = async (remedy: string) => {
    setSelectedRemedy(remedy);
    setIsLoadingRemedyRubrics(true);
    
    const res = await repertoryBrowserApi.getRubricsByRemedy(remedy, sourceFilter === 'both' ? undefined : sourceFilter);
    if (res.success && res.data) {
      setRemedyRubrics(res.data.rubrics);
    } else {
      setRemedyRubrics([]);
      setApiError({ message: 'Failed to load rubrics for remedy' });
    }
    
    setIsLoadingRemedyRubrics(false);
  };

  const handleToggleRemedyForCase = (remedyName: string) => {
    setSelectedForCase((prev) => {
      const next = new Set(prev);
      if (next.has(remedyName)) {
        next.delete(remedyName);
      } else {
        next.add(remedyName);
      }
      return next;
    });
  };

  const handleConfirmAddToCase = async () => {
    if (!caseId || selectedForCase.size === 0) return;
    setIsSavingToCase(true);
    const joined = Array.from(selectedForCase).join(', ');
    try {
      const result = await caseApi.updateCase(caseId, { remedy_name: joined });
      if (result.success && result.data) {
        updateCaseInStore(caseId, { remedy_name: joined });
        navigate(`/cases/${caseId}`);
      } else {
        setApiError({ message: 'Failed to save remedies to case' });
      }
    } catch (err) {
      setApiError({ message: 'An unexpected error occurred.' });
    } finally {
      setIsSavingToCase(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-surface-50 overflow-hidden">
      {/* Header */}
      <div className="h-auto md:h-16 flex flex-col md:flex-row md:items-center justify-between p-4 md:px-6 bg-white border-b border-surface-200 shrink-0 gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <h1 className="text-xl font-bold text-surface-900">Repertory</h1>
          
          <div className="flex bg-surface-100 p-1 rounded-lg self-start">
            <button
              onClick={() => { setViewMode('repertory'); setSelectedChapter(null); setSelectedRubric(null); }}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                viewMode === 'repertory' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              Browse Chapters
            </button>
            <button
              onClick={() => { setViewMode('remedy'); setSelectedRemedy(null); }}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                viewMode === 'remedy' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              Remedy Index
            </button>
          </div>
          <div className="h-6 w-px bg-surface-200 hidden sm:block mx-1"></div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as 'both' | 'kent' | 'boger')}
            className="text-sm font-medium bg-surface-100 border-none rounded-lg px-3 py-1.5 text-surface-700 cursor-pointer hover:bg-surface-200 transition-colors focus:ring-0"
          >
            <option value="both">All Repertories</option>
            <option value="kent">Kent's Repertory</option>
            <option value="boger">Boger's Boenninghausen</option>
          </select>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          {clipboard.length > 0 && (
            <button
              onClick={() => setShowGrid(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors shadow-sm"
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Clipboard ({clipboard.length})</span>
              <span className="sm:hidden">{clipboard.length}</span>
            </button>
          )}
          <button className="flex items-center gap-1.5 text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors">
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Help</span>
          </button>
          <button onClick={() => navigate('/cases/new')} className="btn-primary py-1.5 px-3 text-xs sm:text-sm shadow-sm">
            + New Case
          </button>
        </div>
      </div>

      {/* Case Context Banner */}
      {caseId && (
        <div className="h-auto py-2 sm:h-12 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 bg-brand-50 border-b border-brand-200 shrink-0 gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-brand-800">
            <Pill className="w-4 h-4 shrink-0" />
            Select remedies for this case — click to toggle, then confirm below
          </div>
          <button
            onClick={() => navigate(`/cases/${caseId}`)}
            className="flex items-center gap-1 text-xs sm:text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Case
          </button>
        </div>
      )}

      {/* Mobile Back Navigation Bar */}
      {((viewMode === 'repertory' && selectedChapter) || (viewMode === 'remedy' && selectedRemedy)) && (
        <div className="lg:hidden h-10 px-4 flex items-center bg-surface-100 border-b border-surface-200 text-sm font-medium shrink-0">
          {viewMode === 'repertory' ? (
            selectedRubric ? (
              <button onClick={() => setSelectedRubric(null)} className="flex items-center gap-1 text-brand-600">
                <ArrowLeft className="w-4 h-4" /> Back to Rubrics
              </button>
            ) : selectedChapter ? (
              <button onClick={() => setSelectedChapter(null)} className="flex items-center gap-1 text-brand-600">
                <ArrowLeft className="w-4 h-4" /> Back to Chapters
              </button>
            ) : null
          ) : (
            selectedRemedy ? (
              <button onClick={() => setSelectedRemedy(null)} className="flex items-center gap-1 text-brand-600">
                <ArrowLeft className="w-4 h-4" /> Back to Remedies
              </button>
            ) : null
          )}
        </div>
      )}

      {apiError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4">
          <ErrorAlert error={apiError} onClose={() => setApiError(null)} />
        </div>
      )}

      {/* Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'repertory' ? (
          <>
            <div className={`w-full lg:w-64 border-r border-surface-200 flex flex-col shrink-0 ${
              selectedChapter ? 'hidden lg:flex' : 'flex'
            }`}>
              <ChapterListPane
                chapters={chapters}
                selectedChapter={selectedChapter}
                onSelectChapter={handleSelectChapter}
                isLoading={isLoadingChapters}
              />
            </div>
            
            <div className={`w-full lg:w-80 border-r border-surface-200 flex flex-col shrink-0 ${
              selectedChapter && !selectedRubric ? 'flex' : 'hidden lg:flex'
            }`}>
              <RubricListPane
                chapter={selectedChapter}
                rubrics={rubrics}
                selectedRubric={selectedRubric}
                onSelectRubric={handleSelectRubric}
                isLoading={isLoadingRubrics}
              />
            </div>
            
            <div className={`flex-1 flex flex-col ${
              selectedRubric ? 'flex' : 'hidden lg:flex'
            }`}>
              <RemedyGridPane
                chapter={selectedChapter}
                rubric={selectedRubric}
                remedies={remedies}
                isLoading={isLoadingRemedies}
                caseMode={!!caseId}
                selectedForCase={selectedForCase}
                onToggleForCase={caseId ? handleToggleRemedyForCase : undefined}
              />
            </div>
          </>
        ) : (
          <>
            <div className={`w-full lg:w-80 border-r border-surface-200 flex flex-col shrink-0 ${
              selectedRemedy ? 'hidden lg:flex' : 'flex'
            }`}>
              <RemedyIndexListPane
                remedies={allRemedies}
                selectedRemedy={selectedRemedy}
                onSelectRemedy={caseId ? handleToggleRemedyForCase : handleSelectRemedy}
                isLoading={isLoadingAllRemedies}
                caseMode={!!caseId}
                selectedForCase={selectedForCase}
              />
            </div>
            <div className={`flex-1 flex flex-col ${
              selectedRemedy ? 'flex' : 'hidden lg:flex'
            }`}>
              <RemedyRubricsGridPane
                remedy={selectedRemedy}
                rubrics={remedyRubrics}
                isLoading={isLoadingRemedyRubrics}
                caseMode={!!caseId}
                selectedForCase={selectedForCase}
                onToggleForCase={caseId ? handleToggleRemedyForCase : undefined}
              />
            </div>
          </>
        )}
      </div>

      {/* Floating Action Bar for confirming selections */}
      {caseId && selectedForCase.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto max-w-sm sm:max-w-none">
          <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3 bg-brand-700 text-white rounded-2xl shadow-2xl border border-brand-600">
            <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
              {selectedForCase.size} {selectedForCase.size === 1 ? 'remedy' : 'remedies'}
            </span>
            <button
              onClick={() => setSelectedForCase(new Set())}
              className="p-1.5 rounded-lg hover:bg-brand-600 transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleConfirmAddToCase}
              disabled={isSavingToCase}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-5 sm:py-2 bg-white text-brand-700 font-bold text-xs sm:text-sm rounded-xl hover:bg-brand-50 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              {isSavingToCase ? 'Saving...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Repertorization Grid Overlay */}
      {showGrid && (
        <div className="fixed inset-0 z-[100] bg-surface-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:p-12">
          <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-6xl overflow-hidden flex flex-col border border-surface-200">
            <RepertorizationGrid onClose={() => setShowGrid(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default RepertoryBrowserPage;
