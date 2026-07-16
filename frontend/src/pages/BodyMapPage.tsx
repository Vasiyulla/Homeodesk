import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BrainCircuit, Activity, Heart, Eye } from 'lucide-react';
import { symptomApi } from '../services/symptomApi';
import Modal from '../components/Modal';

const BodyMapPage: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [selectedRubric, setSelectedRubric] = useState<any | null>(null);

  const handleRegionClick = async (region: string) => {
    setSelectedRegion(region);
    setIsLoading(true);
    try {
      const res = await symptomApi.searchSymptoms(region, 'both', 50);
      if (res.success && res.data) {
        setResults(res.data.results || []);
      } else {
        setResults([]);
      }
    } catch (err) {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Nervous system colors
  const activeColor = '#0ea5e9'; // Sky blue for active nerve
  const defaultNerve = '#94a3b8'; // Slate for inactive nerve
  const glowFilter = 'drop-shadow(0px 0px 8px rgba(14, 165, 233, 0.8))';

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-4 lg:mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2 md:gap-3">
            <BrainCircuit className="text-primary-600 w-6 h-6 md:w-8 md:h-8 shrink-0" />
            Neural-Anatomical Map
          </h1>
          <p className="mt-1 md:mt-2 text-gray-600 max-w-3xl text-sm md:text-lg">
            High-fidelity interactive nervous system view. Select nerve clusters to query related rubrics.
          </p>
        </div>
        
        {/* Gender Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 w-full md:w-auto self-stretch md:self-auto">
          <button 
            onClick={() => setGender('male')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all ${gender === 'male' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Male
          </button>
          <button 
            onClick={() => setGender('female')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all ${gender === 'female' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Female
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0 lg:overflow-hidden">
        
        {/* Left Side: Body Map SVG */}
        <div className="lg:w-5/12 h-[35vh] lg:h-full bg-gray-900 rounded-2xl shadow-xl border border-gray-800 p-4 lg:p-6 flex flex-col items-center justify-center relative overflow-hidden shrink-0">
          
          {/* Cyberpunk/Medical Overlay Elements */}
          <div className="absolute top-4 left-4 flex items-center gap-2 text-xs font-mono text-cyan-400 bg-gray-800/50 px-3 py-1.5 rounded border border-cyan-900/50">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            NEURAL SCAN ACTIVE
          </div>
          
          <div className="absolute bottom-4 right-4 text-[10px] font-mono text-gray-600 text-right">
            <div>SYS.VER: 4.9.1</div>
            <div>BIOMETRIC LOCK: ENGAGED</div>
          </div>
          
          <div className="relative w-full max-w-[400px] h-full flex items-center justify-center">
            
            {/* The SVG Container */}
            <AnimatePresence mode="wait">
              <motion.svg 
                key={gender}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
                viewBox="0 0 300 700" 
                className="w-full h-full max-h-[600px]"
                style={{ filter: 'drop-shadow(0px 0px 20px rgba(14, 165, 233, 0.1))' }}
              >
                {/* Silhouette (Male vs Female) */}
                <path 
                  d={gender === 'male' 
                    ? "M150 30 C120 30, 115 80, 150 90 C185 80, 180 30, 150 30 Z M90 110 C40 120, 30 250, 40 330 L60 330 C70 200, 90 150, 100 130 C100 180, 90 300, 100 350 C90 400, 80 600, 80 650 L120 650 C130 500, 140 400, 140 370 C145 370, 155 370, 160 370 C160 400, 170 500, 180 650 L220 650 C220 600, 210 400, 200 350 C210 300, 200 180, 200 130 C210 150, 230 200, 240 330 L260 330 C270 250, 260 120, 210 110 C180 100, 120 100, 90 110 Z"
                    : "M150 35 C125 35, 120 80, 150 90 C180 80, 175 35, 150 35 Z M100 115 C60 125, 45 250, 50 320 L65 320 C75 200, 95 160, 105 140 C105 160, 95 230, 95 280 C80 320, 75 380, 85 410 C75 480, 75 600, 85 640 L120 640 C130 500, 140 420, 145 390 C150 390, 155 390, 160 390 C160 420, 170 500, 180 640 L215 640 C225 600, 225 480, 215 410 C225 380, 220 320, 205 280 C205 230, 195 160, 195 140 C205 160, 225 200, 235 320 L250 320 C255 250, 240 125, 200 115 C180 110, 120 110, 100 115 Z"
                  }
                  fill="#1f2937" 
                  stroke="#374151"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />

                {/* --- NERVOUS SYSTEM --- */}
                
                {/* 1. Mind / Brain */}
                <motion.g
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleRegionClick('Mind')}
                  className="cursor-pointer"
                  style={{ filter: selectedRegion === 'Mind' ? glowFilter : 'none' }}
                >
                  <circle cx="150" cy="55" r="22" fill={selectedRegion === 'Mind' ? activeColor : defaultNerve} opacity="0.3" />
                  <path d="M150 35 Q130 45, 150 75 Q170 45, 150 35" fill="none" stroke={selectedRegion === 'Mind' ? activeColor : defaultNerve} strokeWidth="3" />
                  <path d="M140 50 Q130 60, 145 70" fill="none" stroke={selectedRegion === 'Mind' ? activeColor : defaultNerve} strokeWidth="2" />
                  <path d="M160 50 Q170 60, 155 70" fill="none" stroke={selectedRegion === 'Mind' ? activeColor : defaultNerve} strokeWidth="2" />
                </motion.g>

                {/* 2. Spinal Cord (Back) */}
                <motion.path
                  whileHover={{ strokeWidth: 8 }}
                  onClick={() => handleRegionClick('Back')}
                  className="cursor-pointer transition-all"
                  style={{ filter: selectedRegion === 'Back' ? glowFilter : 'none' }}
                  d="M150 75 L150 380"
                  fill="none" 
                  stroke={selectedRegion === 'Back' ? activeColor : defaultNerve} 
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                {/* 3. Chest / Respiratory */}
                <motion.g
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleRegionClick('Chest')}
                  className="cursor-pointer"
                  style={{ filter: selectedRegion === 'Chest' ? glowFilter : 'none' }}
                >
                  {/* Ribcage nerves */}
                  {[120, 140, 160, 180, 200, 220].map((y, i) => (
                    <g key={`rib-${i}`}>
                      <path d={`M150 ${y} Q110 ${y-10}, 105 ${y+10}`} fill="none" stroke={selectedRegion === 'Chest' ? activeColor : defaultNerve} strokeWidth="2" opacity="0.7" />
                      <path d={`M150 ${y} Q190 ${y-10}, 195 ${y+10}`} fill="none" stroke={selectedRegion === 'Chest' ? activeColor : defaultNerve} strokeWidth="2" opacity="0.7" />
                    </g>
                  ))}
                  {/* Vagus nerve overlay */}
                  <path d="M150 80 Q135 150, 140 230" fill="none" stroke={selectedRegion === 'Chest' ? activeColor : defaultNerve} strokeWidth="2" strokeDasharray="4 2" />
                  <path d="M150 80 Q165 150, 160 230" fill="none" stroke={selectedRegion === 'Chest' ? activeColor : defaultNerve} strokeWidth="2" strokeDasharray="4 2" />
                </motion.g>

                {/* 4. Abdomen / Digestion */}
                <motion.g
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleRegionClick('Abdomen')}
                  className="cursor-pointer"
                  style={{ filter: selectedRegion === 'Abdomen' ? glowFilter : 'none' }}
                >
                  <circle cx="150" cy="280" r="35" fill={selectedRegion === 'Abdomen' ? activeColor : defaultNerve} opacity="0.1" />
                  {/* Enteric Nervous System network */}
                  <path d="M150 240 Q120 280, 150 320 Q180 280, 150 240" fill="none" stroke={selectedRegion === 'Abdomen' ? activeColor : defaultNerve} strokeWidth="2" />
                  <path d="M140 260 L130 280 L145 300" fill="none" stroke={selectedRegion === 'Abdomen' ? activeColor : defaultNerve} strokeWidth="1.5" />
                  <path d="M160 260 L170 280 L155 300" fill="none" stroke={selectedRegion === 'Abdomen' ? activeColor : defaultNerve} strokeWidth="1.5" />
                  <path d="M150 250 L150 310" fill="none" stroke={selectedRegion === 'Abdomen' ? activeColor : defaultNerve} strokeWidth="1.5" />
                </motion.g>

                {/* 5. Left Arm Extremities */}
                <motion.g
                  whileHover={{ filter: 'drop-shadow(0px 0px 10px #0ea5e9)' }}
                  onClick={() => handleRegionClick('Extremities')}
                  className="cursor-pointer"
                  style={{ filter: selectedRegion === 'Extremities' ? glowFilter : 'none' }}
                >
                  {/* Brachial Plexus to radial/ulnar nerves */}
                  <path d="M150 90 Q110 100, 100 130 Q95 200, 65 310" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="3" />
                  <path d="M100 130 Q80 200, 50 310" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="2" opacity="0.7" />
                  <path d="M80 190 L60 200" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="1.5" />
                  <path d="M70 250 L55 260" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="1.5" />
                </motion.g>

                {/* 6. Right Arm Extremities */}
                <motion.g
                  whileHover={{ filter: 'drop-shadow(0px 0px 10px #0ea5e9)' }}
                  onClick={() => handleRegionClick('Extremities')}
                  className="cursor-pointer"
                  style={{ filter: selectedRegion === 'Extremities' ? glowFilter : 'none' }}
                >
                  <path d="M150 90 Q190 100, 200 130 Q205 200, 235 310" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="3" />
                  <path d="M200 130 Q220 200, 250 310" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="2" opacity="0.7" />
                  <path d="M220 190 L240 200" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="1.5" />
                  <path d="M230 250 L245 260" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="1.5" />
                </motion.g>

                {/* 7. Left Leg Extremities */}
                <motion.g
                  whileHover={{ filter: 'drop-shadow(0px 0px 10px #0ea5e9)' }}
                  onClick={() => handleRegionClick('Extremities')}
                  className="cursor-pointer"
                  style={{ filter: selectedRegion === 'Extremities' ? glowFilter : 'none' }}
                >
                  {/* Sciatic Nerve */}
                  <path d="M150 370 Q110 400, 100 620" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="4" />
                  {/* Tibial/Fibular branches */}
                  <path d="M110 500 Q90 550, 90 620" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="2" opacity="0.7" />
                  <path d="M125 430 L105 450" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="1.5" />
                  <path d="M115 550 L95 570" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="1.5" />
                </motion.g>

                {/* 8. Right Leg Extremities */}
                <motion.g
                  whileHover={{ filter: 'drop-shadow(0px 0px 10px #0ea5e9)' }}
                  onClick={() => handleRegionClick('Extremities')}
                  className="cursor-pointer"
                  style={{ filter: selectedRegion === 'Extremities' ? glowFilter : 'none' }}
                >
                  <path d="M150 370 Q190 400, 200 620" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="4" />
                  <path d="M190 500 Q210 550, 210 620" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="2" opacity="0.7" />
                  <path d="M175 430 L195 450" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="1.5" />
                  <path d="M185 550 L205 570" fill="none" stroke={selectedRegion === 'Extremities' ? activeColor : defaultNerve} strokeWidth="1.5" />
                </motion.g>
              </motion.svg>
            </AnimatePresence>
            
          </div>
        </div>

        {/* Right Side: Results Panel */}
        <div className="lg:w-7/12 flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Search className="w-5 h-5 text-primary-500" />
              {selectedRegion ? `Nerve Cluster: ${selectedRegion}` : 'Select a nerve cluster'}
            </h2>
            {isLoading && (
              <span className="flex items-center gap-2 text-sm text-primary-600 font-medium bg-primary-50 px-3 py-1 rounded-full">
                <svg className="animate-spin h-4 w-4 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Scanning Repertory...
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
            {!selectedRegion && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Activity className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-xl font-bold text-gray-500">Awaiting Target Selection</p>
                <p className="text-sm mt-2 text-gray-400">Click on any glowing nerve pathway on the body map to fetch related symptoms.</p>
              </div>
            )}

            {selectedRegion && !isLoading && results.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Eye className="w-12 h-12 mb-4 opacity-30 text-amber-500" />
                <p className="text-lg font-medium text-gray-600">No rubrics found for {selectedRegion}</p>
                <p className="text-sm mt-2">Try a different nerve branch.</p>
              </div>
            )}

            {selectedRegion && !isLoading && results.length > 0 && (
              <div className="grid gap-4">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary-50 text-primary-900 p-4 rounded-xl border border-primary-100 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-lg">Region: {selectedRegion}</h3>
                    <p className="text-sm text-primary-700">Found {results.length} related rubrics in database.</p>
                  </div>
                  <Activity className="w-6 h-6 text-primary-400 opacity-50" />
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.map((result: any, idx: number) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                      key={idx} 
                      onClick={() => setSelectedRubric(result)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                            {result.chapter || result.section}
                          </span>
                          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 text-rose-400" />
                            {result.remedy_count || (result.remedies && result.remedies.length) || 0} Remedies
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors text-base leading-snug">
                          {result.main_rubric || result.rubric}
                        </h3>
                        {result.sub_condition && (
                          <p className="text-sm text-gray-500 mt-1 italic">↳ {result.sub_condition}</p>
                        )}
                        
                        {/* Remedies List Section */}
                        {result.remedies && result.remedies.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Top Remedies</p>
                            <div className="flex flex-wrap gap-1.5">
                              {[...result.remedies]
                                .sort((a: any, b: any) => b.grade - a.grade)
                                .slice(0, 8)
                                .map((rem: any, i: number) => (
                                <span 
                                  key={i} 
                                  title={`Grade ${rem.grade}`}
                                  className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                                    rem.grade >= 3 
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold' 
                                      : rem.grade === 2 
                                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                        : 'bg-gray-50 text-gray-600 border-gray-200'
                                  }`}
                                >
                                  {rem.name}
                                </span>
                              ))}
                              {result.remedies.length > 8 && (
                                <span className="px-2 py-0.5 text-xs font-medium text-gray-400 bg-gray-50 rounded border border-gray-100">
                                  +{result.remedies.length - 8} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end">
                        <button 
                          onClick={(e) => { e.stopPropagation(); /* Add to case logic */ }}
                          className="px-3 py-1.5 bg-gray-50 group-hover:bg-primary-50 text-gray-600 group-hover:text-primary-700 text-xs font-bold rounded border border-gray-200 group-hover:border-primary-200 transition-colors"
                        >
                          Add to Case
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rubric Details Modal */}
      <Modal 
        isOpen={!!selectedRubric} 
        onClose={() => setSelectedRubric(null)} 
        title="Rubric Details & Remedies"
        size="lg"
      >
        {selectedRubric && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                  {selectedRubric.chapter || selectedRubric.section}
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  {selectedRubric.remedy_count || (selectedRubric.remedies && selectedRubric.remedies.length) || 0} Remedies
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {selectedRubric.main_rubric || selectedRubric.rubric}
              </h3>
              {selectedRubric.sub_condition && (
                <p className="text-gray-600 mt-1 italic text-lg">↳ {selectedRubric.sub_condition}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-[400px] overflow-y-auto">
              <h4 className="font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">Full Remedy List</h4>
              <div className="flex flex-wrap gap-2">
                {[...(selectedRubric.remedies || [])]
                  .sort((a: any, b: any) => b.grade - a.grade)
                  .map((rem: any, i: number) => (
                    <span 
                      key={i} 
                      title={`Grade ${rem.grade}`}
                      className={`px-2.5 py-1 text-sm font-semibold rounded border ${
                        rem.grade >= 3 
                          ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold shadow-sm' 
                          : rem.grade === 2 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {rem.name}
                      <span className="ml-1.5 opacity-50 text-[10px]">{rem.grade}</span>
                    </span>
                  ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setSelectedRubric(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BodyMapPage;
