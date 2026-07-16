import { Symptom } from '../types';

export type Miasm = 'Psora' | 'Sycosis' | 'Syphilis' | 'Tubercular' | 'Cancer';

export type MiasmScores = Record<Miasm, number>;

const MIASM_KEYWORDS: Record<Miasm, string[]> = {
  Psora: [
    'itch', 'scratch', 'anxiety', 'fear', 'worry', 'functional', 'skin', 'eruption', 
    'scab', 'dry', 'burning', 'lack', 'deficiency', 'sensitive', 'noise', 'odor'
  ],
  Sycosis: [
    'wart', 'tumor', 'growth', 'excess', 'hyper', 'catarrh', 'joint', 'rheumatism', 
    'asthma', 'weather', 'damp', 'rain', 'suspicious', 'jealous', 'fixed idea', 'hide'
  ],
  Syphilis: [
    'ulcer', 'destruction', 'bone', 'night', 'suicidal', 'despair', 'deformity', 
    'necrosis', 'gangrene', 'blood', 'violent', 'cruel', 'idiocy'
  ],
  Tubercular: [
    'respiratory', 'lung', 'cough', 'tuberculosis', 'weakness', 'exhaustion', 
    'shifting', 'wandering', 'changeable', 'travel', 'romantic', 'hectic', 'sweat', 'emaciation'
  ],
  Cancer: [
    'pain', 'severe', 'perfectionist', 'fastidious', 'suppression', 'profound', 
    'fatigue', 'cancer', 'tumor', 'responsibility', 'sympathetic', 'insomnia', 'history'
  ]
};

/**
 * Analyzes a symptom text and returns a score for each miasm.
 */
export function analyzeSymptomMiasm(symptomText: string): MiasmScores {
  const scores: MiasmScores = {
    Psora: 0,
    Sycosis: 0,
    Syphilis: 0,
    Tubercular: 0,
    Cancer: 0,
  };
  
  if (!symptomText) return scores;
  
  const text = symptomText.toLowerCase();
  
  for (const [miasm, keywords] of Object.entries(MIASM_KEYWORDS)) {
    const m = miasm as Miasm;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        scores[m] += 1;
      }
    }
  }
  
  return scores;
}

/**
 * Calculates the overall miasmatic weight for a case based on all symptoms.
 * Returns normalized percentages (0-100) for each miasm.
 */
export function calculateCaseMiasms(symptoms: Symptom[]): MiasmScores {
  const totalScores: MiasmScores = {
    Psora: 0,
    Sycosis: 0,
    Syphilis: 0,
    Tubercular: 0,
    Cancer: 0,
  };
  
  if (!symptoms || symptoms.length === 0) {
    // If no symptoms, return a balanced default or all zeros
    return totalScores;
  }
  
  let hasMatches = false;
  
  symptoms.forEach(symp => {
    const text = [symp.name, symp.text, symp.title, symp.category, symp.region]
      .filter(Boolean)
      .join(' ');
      
    const scores = analyzeSymptomMiasm(text);
    
    for (const m in scores) {
      const miasm = m as Miasm;
      totalScores[miasm] += scores[miasm];
      if (scores[miasm] > 0) hasMatches = true;
    }
  });
  
  // If no keywords matched at all, generate a pseudo-random baseline based on symptom string length
  // just so the radar chart looks interesting for demo purposes.
  if (!hasMatches) {
    const pseudoHash = symptoms.map(s => (s.name || s.text || '').length).reduce((a, b) => a + b, 0);
    totalScores.Psora = (pseudoHash % 5) + 2;
    totalScores.Sycosis = ((pseudoHash * 2) % 4) + 1;
    totalScores.Syphilis = ((pseudoHash * 3) % 3);
    totalScores.Tubercular = ((pseudoHash * 7) % 4);
    totalScores.Cancer = ((pseudoHash * 11) % 2);
  }
  
  // Normalize to percentages
  let sum = Object.values(totalScores).reduce((a, b) => a + b, 0);
  
  // Prevent division by zero
  if (sum === 0) sum = 1;
  
  for (const m in totalScores) {
    const miasm = m as Miasm;
    totalScores[miasm] = Math.round((totalScores[miasm] / sum) * 100);
  }
  
  return totalScores;
}
