import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Symptom } from '../types';
import { calculateCaseMiasms, Miasm } from '../utils/miasmClassifier';
import { ShieldAlert, ShieldCheck, Activity } from 'lucide-react';

interface Props {
  symptoms: Symptom[];
}

const MIASM_LIST: Miasm[] = ['Psora', 'Sycosis', 'Syphilis', 'Tubercular', 'Cancer'];
const MIASM_COLORS: Record<Miasm, string> = {
  Psora: '#3b82f6', // blue
  Sycosis: '#10b981', // emerald
  Syphilis: '#ef4444', // red
  Tubercular: '#f59e0b', // amber
  Cancer: '#8b5cf6' // violet
};

const MiasmaticRadar: React.FC<Props> = ({ symptoms }) => {
  const scores = useMemo(() => calculateCaseMiasms(symptoms), [symptoms]);
  
  // Find dominant miasm
  let dominantMiasm: Miasm | null = null;
  let maxScore = 0;
  for (const [miasm, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantMiasm = miasm as Miasm;
    }
  }

  // Radar geometry
  const width = 400;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 130;

  // Calculate polygon points based on values (0 to 100)
  const calculatePoints = (values: Record<Miasm, number>, maxVal = 100) => {
    return MIASM_LIST.map((miasm, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
      const normalizedValue = values[miasm] / maxVal;
      const x = centerX + radius * normalizedValue * Math.cos(angle);
      const y = centerY + radius * normalizedValue * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  // Create grid lines (concentric pentagons)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];
  const fullScoreGrid = {
    Psora: 100, Sycosis: 100, Syphilis: 100, Tubercular: 100, Cancer: 100
  };

  const activePoints = calculatePoints(scores);

  if (!symptoms || symptoms.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-500">No Symptoms to Analyze</h3>
        <p className="text-gray-400 text-sm mt-1">Add symptoms to the case to generate the miasmatic radar.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
      
      {/* Radar Chart Area */}
      <div className="bg-gray-900 rounded-3xl p-6 flex items-center justify-center relative overflow-hidden shadow-2xl border border-gray-800">
        
        {/* Ambient glow behind chart */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500/10 blur-[80px] rounded-full pointer-events-none"></div>

        <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="drop-shadow-2xl max-w-[400px]">
          {/* Defs for gradients */}
          <defs>
            <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Draw concentric grid pentagons */}
          {gridLevels.map((level, i) => (
            <polygon 
              key={`grid-${i}`}
              points={calculatePoints(fullScoreGrid, 1 / level)}
              fill="none"
              stroke="#374151"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Draw Axis Lines */}
          {MIASM_LIST.map((_, i) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            return (
              <line 
                key={`axis-${i}`} 
                x1={centerX} y1={centerY} 
                x2={x} y2={y} 
                stroke="#4b5563" strokeWidth="1"
              />
            );
          })}

          {/* Draw the Data Polygon */}
          <motion.polygon
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            points={activePoints}
            fill="url(#radarFill)"
            stroke="#0ea5e9"
            strokeWidth="3"
            filter="url(#glow)"
            className="origin-center"
          />

          {/* Draw Data Points */}
          {MIASM_LIST.map((miasm, i) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
            const normalizedValue = scores[miasm] / 100;
            const x = centerX + radius * normalizedValue * Math.cos(angle);
            const y = centerY + radius * normalizedValue * Math.sin(angle);
            return (
              <motion.circle 
                key={`point-${i}`}
                initial={{ r: 0 }}
                animate={{ r: 5 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                cx={x} cy={y} fill="#0ea5e9"
              />
            );
          })}

          {/* Draw Labels */}
          {MIASM_LIST.map((miasm, i) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
            // Push labels out further
            const labelRadius = radius + 35;
            const x = centerX + labelRadius * Math.cos(angle);
            const y = centerY + labelRadius * Math.sin(angle);
            
            // Adjust anchor based on position
            let textAnchor = "middle";
            if (x > centerX + 20) textAnchor = "start";
            if (x < centerX - 20) textAnchor = "end";

            return (
              <g key={`label-${i}`}>
                <text 
                  x={x} y={y} 
                  fill="#9ca3af" 
                  fontSize="12" 
                  fontWeight="bold"
                  textAnchor={textAnchor}
                  dominantBaseline="middle"
                  className="uppercase tracking-wider"
                >
                  {miasm}
                </text>
                <text 
                  x={x} y={y + 16} 
                  fill={dominantMiasm === miasm ? MIASM_COLORS[miasm] : "#6b7280"} 
                  fontSize="14" 
                  fontWeight="900"
                  textAnchor={textAnchor}
                  dominantBaseline="middle"
                >
                  {scores[miasm]}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Analytics Panel */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-full flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Miasmatic Breakdown</h3>
            <p className="text-sm text-gray-500">Root cause analysis based on symptoms</p>
          </div>
        </div>

        {dominantMiasm ? (
          <div className="mb-8 p-5 rounded-2xl border" style={{ backgroundColor: `${MIASM_COLORS[dominantMiasm]}10`, borderColor: `${MIASM_COLORS[dominantMiasm]}30` }}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5" style={{ color: MIASM_COLORS[dominantMiasm] }} />
              <h4 className="font-bold text-gray-900">Dominant Miasm: {dominantMiasm}</h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Based on the current symptom profile, this case leans heavily towards the {dominantMiasm} miasm ({maxScore}%). 
              Consider an anti-miasmatic intercurrent remedy if the well-selected acute remedy fails to hold.
            </p>
          </div>
        ) : (
          <div className="mb-8 p-5 rounded-2xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-gray-500" />
              <h4 className="font-bold text-gray-900">Balanced / Unclear</h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              The miasmatic weight is evenly distributed or unclear. Focus on the acute totality of symptoms first.
            </p>
          </div>
        )}

        {/* Progress Bars */}
        <div className="space-y-4 flex-1">
          {MIASM_LIST.sort((a, b) => scores[b] - scores[a]).map(miasm => (
            <div key={miasm}>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-gray-700">{miasm}</span>
                <span className="text-gray-500">{scores[miasm]}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${scores[miasm]}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: MIASM_COLORS[miasm] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MiasmaticRadar;
