import { Symptom } from '../types';

export type HeringsLawStatus = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'INSUFFICIENT_DATA';

export interface HeringsLawEvaluation {
  status: HeringsLawStatus;
  message: string;
  details: string[];
}

// Vitality score mapping (higher is more vital to life)
export const VITALITY_MAP: Record<string, number> = {
  'Mind': 10,
  'Head': 9,
  'Heart': 9,
  'Chest': 8,
  'Lungs': 8,
  'Abdomen': 6,
  'Liver': 6,
  'Stomach': 6,
  'Back': 5,
  'Extremities': 4,
  'Joints': 4,
  'Skin': 2,
  'Hair': 1,
};

export function getVitalityScore(region?: string): number {
  if (!region) return 5; // default middle score
  return VITALITY_MAP[region] || 5;
}

export function evaluateHeringsLaw(symptoms: Symptom[]): HeringsLawEvaluation {
  if (!symptoms || symptoms.length < 2) {
    return {
      status: 'INSUFFICIENT_DATA',
      message: 'Need at least 2 tracked symptoms',
      details: ['Hering\'s Law evaluates the relationship between multiple symptoms over time.']
    };
  }

  // Filter symptoms by status
  const resolving = symptoms.filter(s => s.status === 'Improving' || s.status === 'Resolved');
  const active = symptoms.filter(s => s.status === 'Active' || !s.status);

  if (resolving.length === 0) {
    return {
      status: 'NEUTRAL',
      message: 'Awaiting progress',
      details: ['No symptoms have started resolving yet.']
    };
  }

  let isPositive = false;
  let isNegative = false;
  const details: string[] = [];

  // 1. Check "From more important to less important organs" (Center to Periphery)
  for (const resSymp of resolving) {
    const resScore = resSymp.vitality_score || getVitalityScore(resSymp.region);
    
    for (const actSymp of active) {
      const actScore = actSymp.vitality_score || getVitalityScore(actSymp.region);
      
      if (resScore > actScore) {
        isPositive = true;
        details.push(`Healing from center to periphery: '${resSymp.name || resSymp.text || resSymp.title}' (vitality ${resScore}) is resolving, while '${actSymp.name || actSymp.text || actSymp.title}' (vitality ${actScore}) is active.`);
      } else if (resScore < actScore) {
        // If a less vital symptom resolved, but a more vital one is active (and possibly newer), this is suppression
        isNegative = true;
        details.push(`Suppression Warning: '${resSymp.name || resSymp.text || resSymp.title}' (vitality ${resScore}) resolved, but more vital '${actSymp.name || actSymp.text || actSymp.title}' (vitality ${actScore}) is active.`);
      }
    }
  }

  // 2. Reverse order of coming
  // Find the most recently appeared symptom
  const sortedByDate = [...symptoms]
    .filter(s => s.appearance_date)
    .sort((a, b) => new Date(b.appearance_date!).getTime() - new Date(a.appearance_date!).getTime());

  if (sortedByDate.length > 1) {
    const newestSymptom = sortedByDate[0];
    if (newestSymptom.status === 'Improving' || newestSymptom.status === 'Resolved') {
      isPositive = true;
      details.push(`Reverse order of coming: The most recent symptom '${newestSymptom.name || newestSymptom.text || newestSymptom.title}' is resolving first.`);
    }
  }

  if (isNegative && !isPositive) {
    return {
      status: 'NEGATIVE',
      message: 'Warning: Possible Suppression',
      details: details
    };
  }

  if (isPositive) {
    return {
      status: 'POSITIVE',
      message: 'Healing follows Hering\'s Law',
      details: details
    };
  }

  return {
    status: 'NEUTRAL',
    message: 'Mixed or unclear healing direction',
    details: details.length > 0 ? details : ['Symptoms are resolving, but no clear direction (center-to-periphery or reverse order) is established.']
  };
}
