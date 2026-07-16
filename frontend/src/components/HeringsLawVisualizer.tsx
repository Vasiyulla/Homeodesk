import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { Symptom } from '../types';
import { evaluateHeringsLaw, VITALITY_MAP, getVitalityScore } from '../utils/heringsLawEvaluator';
import Badge from './Badge';

interface Props {
  symptoms: Symptom[];
}

const HeringsLawVisualizer: React.FC<Props> = ({ symptoms }) => {
  const evaluation = useMemo(() => evaluateHeringsLaw(symptoms), [symptoms]);

  if (!symptoms || symptoms.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-500">No Symptoms Tracked</h3>
        <p className="text-gray-400 text-sm mt-1">Add symptoms with regions to track Hering's Law.</p>
      </div>
    );
  }

  // Group symptoms by vitality
  const sortedSymptoms = [...symptoms].sort((a, b) => {
    return getVitalityScore(b.region) - getVitalityScore(a.region);
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header with Status Indicator */}
      <div className={`p-5 flex items-start gap-4 border-b ${
        evaluation.status === 'POSITIVE' ? 'bg-emerald-50 border-emerald-100' :
        evaluation.status === 'NEGATIVE' ? 'bg-rose-50 border-rose-100' :
        'bg-blue-50 border-blue-100'
      }`}>
        <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
          evaluation.status === 'POSITIVE' ? 'bg-emerald-100 text-emerald-600' :
          evaluation.status === 'NEGATIVE' ? 'bg-rose-100 text-rose-600' :
          'bg-blue-100 text-blue-600'
        }`}>
          {evaluation.status === 'POSITIVE' && <CheckCircle2 className="w-6 h-6" />}
          {evaluation.status === 'NEGATIVE' && <AlertTriangle className="w-6 h-6" />}
          {(evaluation.status === 'NEUTRAL' || evaluation.status === 'INSUFFICIENT_DATA') && <Activity className="w-6 h-6" />}
        </div>
        
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${
            evaluation.status === 'POSITIVE' ? 'text-emerald-900' :
            evaluation.status === 'NEGATIVE' ? 'text-rose-900' :
            'text-blue-900'
          }`}>
            {evaluation.message}
          </h3>
          
          <div className="mt-2 space-y-1">
            {evaluation.details.map((detail, idx) => (
              <p key={idx} className={`text-sm ${
                evaluation.status === 'POSITIVE' ? 'text-emerald-700' :
                evaluation.status === 'NEGATIVE' ? 'text-rose-700' :
                'text-blue-700'
              }`}>
                • {detail}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="p-6 bg-gray-50 flex-1 relative">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Vitality Hierarchy (Center to Periphery)</h4>
        
        <div className="relative pl-4 space-y-6">
          {/* Vertical line */}
          <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gray-200"></div>

          {sortedSymptoms.map((symp, idx) => {
            const isResolving = symp.status === 'Improving' || symp.status === 'Resolved';
            const vitality = getVitalityScore(symp.region);
            
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative flex items-center gap-4 z-10"
              >
                {/* Status Node */}
                <div className={`w-8 h-8 rounded-full border-4 border-gray-50 flex items-center justify-center shrink-0 ${
                  isResolving ? 'bg-emerald-400' : 'bg-amber-400'
                }`}>
                  {isResolving ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Activity className="w-4 h-4 text-white" />}
                </div>

                {/* Symptom Card */}
                <div className={`flex-1 p-4 rounded-xl border shadow-sm flex justify-between items-center ${
                  isResolving ? 'bg-white border-emerald-100 opacity-70' : 'bg-white border-gray-200'
                }`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        vitality >= 8 ? 'bg-purple-100 text-purple-700' :
                        vitality >= 5 ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {symp.region || 'Unknown'} (Level {vitality})
                      </span>
                      {symp.appearance_date && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(symp.appearance_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className={`font-semibold ${isResolving ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {symp.name || symp.text || symp.title}
                    </p>
                  </div>
                  
                  <Badge variant={isResolving ? 'success' : 'warning'}>
                    {symp.status || 'Active'}
                  </Badge>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* Direction Indicator */}
        <div className="absolute left-10 top-0 bottom-0 pointer-events-none flex flex-col justify-between py-10 opacity-20">
          <div className="text-xs font-bold -rotate-90 origin-left text-gray-900 whitespace-nowrap">CENTER / VITAL</div>
          <ArrowRight className="w-8 h-8 text-gray-900 rotate-90 my-auto ml-[-20px]" />
          <div className="text-xs font-bold -rotate-90 origin-left text-gray-900 whitespace-nowrap mb-10">PERIPHERY</div>
        </div>
      </div>
    </div>
  );
};

export default HeringsLawVisualizer;
