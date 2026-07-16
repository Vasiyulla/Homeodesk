import React, { useState } from 'react';
import { useAuthStore } from '../store/store';
import { symptomApi } from '../services/symptomApi';
import Container from '../components/Container';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import Badge from '../components/Badge';
import { Search, BookOpen, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const SymptomSearchPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('both');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const getGradeColor = (grade: number) => {
    switch (grade) {
      case 4: return 'bg-rose-50 border-rose-200 text-rose-700'; // Red
      case 3: return 'bg-amber-50 border-amber-200 text-amber-700'; // Orange
      case 2: return 'bg-sky-50 border-sky-200 text-sky-700'; // Blue
      default: return 'bg-surface-50 border-surface-200 text-surface-600'; // Grey
    }
  };

  if (!isAuthenticated) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await symptomApi.searchSymptoms(query, source, 50);
      if (res.success && res.data) {
        setResults(res.data.results || []);
        setExpandedIndex(null);
      } else {
        setError(res.error || { status: 500, message: 'Search failed', errors: null });
      }
    } catch (err) {
      setError({ status: 500, message: 'An unexpected error occurred.', errors: null });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-sm">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Symptom Search</h1>
          <p className="text-surface-500 mt-1">Search the complete homeopathic materia medica and repertories</p>
        </div>
      </div>

      {error && <ErrorAlert error={error} onClose={() => setError(null)} className="mb-6" />}

      <Card className="mb-8 p-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Symptom Keyword
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-surface-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. throbbing headache, anxiety morning..."
                className="w-full pl-11 pr-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-surface-900 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Repertory Source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-surface-900 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none transition-all"
            >
              <option value="both">Combined (Kent & Boger)</option>
              <option value="Kent">Kent's Repertory</option>
              <option value="Boger">Boger's Repertory</option>
            </select>
          </div>
          
          <Button type="submit" loading={isLoading} className="py-3 px-8">
            Search
          </Button>
        </form>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner text="Searching repertories..." />
        </div>
      ) : results.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h3 className="text-lg font-bold text-surface-900 mb-4">Found {results.length} Matching Rubrics</h3>
          <div className="grid gap-4">
            {results.map((result, idx) => {
              const isExpanded = expandedIndex === idx;
              const remedies = result.remedies || [];
              const sortedRemedies = [...remedies].sort((a, b) => (b.grade || 1) - (a.grade || 1));

              return (
                <Card 
                  key={idx} 
                  className={`transition-all overflow-hidden ${isExpanded ? 'shadow-md border-brand-200' : 'hover:shadow-md cursor-pointer group'}`}
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="neutral" className="text-xs">{result.chapter || result.section}</Badge>
                          <Badge variant={result.source?.toLowerCase() === 'kent' ? 'success' : 'warning'} className="text-xs">
                            {result.source}
                          </Badge>
                          {result.confidence && (
                            <Badge variant="primary" className="text-xs">{result.confidence} Match</Badge>
                          )}
                        </div>
                        <h4 className={`text-lg font-semibold transition-colors ${isExpanded ? 'text-brand-600' : 'text-brand-700 group-hover:text-brand-600'}`}>
                          {result.main_rubric || result.rubric}
                        </h4>
                        {result.sub_condition && (
                          <p className="text-surface-600 font-medium mt-1">↳ {result.sub_condition}</p>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div>
                          <p className="text-2xl font-bold text-surface-900">{result.remedy_count || remedies.length || 0}</p>
                          <p className="text-xs text-surface-500 uppercase tracking-wider font-bold">Remedies</p>
                        </div>
                        <div className={`transform transition-transform ${isExpanded ? 'rotate-90 text-brand-500' : 'text-surface-300 group-hover:text-brand-400'}`}>
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Remedies Grid (Expanded State) */}
                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-6 pt-6 border-t border-surface-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {remedies.length > 0 ? (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-bold text-surface-600 uppercase tracking-wider">
                                Remedies
                              </h4>
                              <div className="flex items-center gap-3 text-xs font-medium text-surface-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Gr. 4</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Gr. 3</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500"></span> Gr. 2</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-surface-400"></span> Gr. 1</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {sortedRemedies.map((remedy: any, rIdx: number) => (
                                <div
                                  key={`${remedy.name || remedy}-${rIdx}`}
                                  className={`p-2 rounded border flex flex-col items-center justify-center text-center text-xs shadow-sm ${getGradeColor(remedy.grade || 1)}`}
                                >
                                  <span className="font-bold">{typeof remedy === 'string' ? remedy : remedy.name?.replace('.', '')}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4 text-surface-400 text-sm">
                            No remedies available in preview
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </motion.div>
      ) : query && !isLoading ? (
        <Card className="text-center py-20 bg-surface-50 border-dashed border-2">
          <Search className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-900 mb-2">No rubrics found</h3>
          <p className="text-surface-500">Try adjusting your keywords or selecting a different repertory source.</p>
        </Card>
      ) : null}
    </Container>
  );
};

export default SymptomSearchPage;
