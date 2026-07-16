/**
 * Local Symptom Search Service — Maps symptoms to rubrics via SQLite FTS5.
 */

import { query } from './database';
import type { ApiResponse, SymptomSearchResponse } from '../../types';

interface RubricMatch {
  chapter: string;
  main_rubric: string;
  sub_condition: string;
  remedy_count: number;
  remedies?: any[];
  source: string;
  similarity_score: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

async function searchSymptomInternal(
  symptomText: string,
  limit: number = 10,
  source: string = 'both'
): Promise<RubricMatch[]> {
  // Build FTS5 query
  const searchTerms = symptomText
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t}"*`)
    .join(' ');

  let sql = `SELECT r.chapter, r.main_rubric, r.sub_condition, r.remedy_count, r.remedy_json, r.source
             FROM repertory_entries r
             JOIN repertory_entries_fts fts ON r.id = fts.rowid
             WHERE fts.search_text MATCH ?`;
  const params: unknown[] = [searchTerms];

  if (source.toLowerCase() !== 'both') {
    sql += ` AND LOWER(r.source) = LOWER(?)`;
    params.push(source);
  }

  sql += ` ORDER BY LENGTH(r.search_text) ASC, r.remedy_count DESC LIMIT ?`;
  params.push(limit);

  let rows = await query<{
    chapter: string;
    main_rubric: string;
    sub_condition: string;
    remedy_count: number;
    remedy_json: string;
    source: string;
  }>(sql, params);

  // Fallback to LIKE if FTS returns nothing
  if (rows.length === 0) {
    let fallbackSql = `SELECT chapter, main_rubric, sub_condition, remedy_count, remedy_json, source
                       FROM repertory_entries
                       WHERE LOWER(search_text) LIKE ?`;
    const fallbackParams: unknown[] = [`%${symptomText.toLowerCase()}%`];

    if (source.toLowerCase() !== 'both') {
      fallbackSql += ` AND LOWER(source) = LOWER(?)`;
      fallbackParams.push(source);
    }

    fallbackSql += ` ORDER BY LENGTH(search_text) ASC, remedy_count DESC LIMIT ?`;
    fallbackParams.push(limit);

    rows = await query(fallbackSql, fallbackParams);
  }

  return rows.map((row) => ({
    chapter: row.chapter,
    main_rubric: row.main_rubric,
    sub_condition: row.sub_condition,
    remedy_count: row.remedy_count,
    remedies: JSON.parse(row.remedy_json || '[]'),
    source: row.source,
    similarity_score: 1.0,
    confidence: (row.remedy_count > 5 ? 'HIGH' : row.remedy_count > 2 ? 'MEDIUM' : 'LOW') as
      'HIGH' | 'MEDIUM' | 'LOW',
  }));
}

export const symptomSearchLocal = {
  searchSymptoms: async (
    symptom: string,
    source = 'both',
    limit = 10
  ): Promise<ApiResponse<SymptomSearchResponse>> => {
    try {
      const results = await searchSymptomInternal(symptom, limit, source);
      return {
        success: true,
        data: {
          symptom,
          count: results.length,
          results: results.map((r) => ({
            ...r,
            similarity_score: r.similarity_score,
            confidence: r.confidence,
          })),
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to search symptoms';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getSymptomsByCategory: async (
    mentalSymptoms?: string[],
    generalSymptoms?: string[],
    particularSymptoms?: string[],
    causationSymptoms?: string[],
    source = 'both'
  ): Promise<ApiResponse<Record<string, unknown[]>>> => {
    try {
      const results: Record<string, unknown[]> = {};

      if (mentalSymptoms?.length) {
        results['Mental'] = [];
        for (const s of mentalSymptoms) {
          const matches = await searchSymptomInternal(s, 5, source);
          results['Mental'].push(...matches);
        }
      }
      if (generalSymptoms?.length) {
        results['General'] = [];
        for (const s of generalSymptoms) {
          const matches = await searchSymptomInternal(s, 5, source);
          results['General'].push(...matches);
        }
      }
      if (particularSymptoms?.length) {
        results['Particular'] = [];
        for (const s of particularSymptoms) {
          const matches = await searchSymptomInternal(s, 5, source);
          results['Particular'].push(...matches);
        }
      }
      if (causationSymptoms?.length) {
        results['Causation'] = [];
        for (const s of causationSymptoms) {
          const matches = await searchSymptomInternal(s, 5, source);
          results['Causation'].push(...matches);
        }
      }

      return { success: true, data: results };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to search by category';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getTopRubrics: async (
    symptom: string,
    count = 3,
    source = 'both'
  ): Promise<ApiResponse<unknown>> => {
    try {
      const results = await searchSymptomInternal(symptom, count, source);
      return {
        success: true,
        data: { symptom, count: results.length, results },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch top rubrics';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};
