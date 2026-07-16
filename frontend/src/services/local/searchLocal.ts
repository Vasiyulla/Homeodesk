/**
 * Local Search Service — Repertory search via SQLite FTS5.
 * Replaces the Python Pandas-based search with native SQLite full-text search.
 */

import { query } from './database';
import type { ApiResponse } from '../../types';
import type {
  RubricEntry,
  ExactRubricResult,
  RemedyDetail,
  RemedyRubricResult,
} from '../repertoryBrowserApi';

export const searchLocal = {
  getChapters: async (): Promise<ApiResponse<{ sections: string[] }>> => {
    try {
      const rows = await query<{ chapter: string }>(
        'SELECT DISTINCT chapter FROM repertory_entries ORDER BY chapter'
      );
      return { success: true, data: { sections: rows.map((r) => r.chapter) } };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch chapters';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getRubricsByChapter: async (
    chapter: string,
    source?: string
  ): Promise<ApiResponse<{ chapter: string; count: number; rubrics: RubricEntry[] }>> => {
    try {
      let sql = `SELECT main_rubric, sub_condition, remedy_count, source
                  FROM repertory_entries WHERE chapter = ?`;
      const params: unknown[] = [chapter];

      if (source && source.toLowerCase() !== 'both') {
        sql += ` AND LOWER(source) = LOWER(?)`;
        params.push(source);
      }

      sql += ` ORDER BY main_rubric, sub_condition`;

      const rows = await query<RubricEntry>(sql, params);
      return {
        success: true,
        data: { chapter, count: rows.length, rubrics: rows },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch rubrics';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getExactRubric: async (
    chapter: string,
    mainRubric: string,
    subCondition: string = '',
    source?: string
  ): Promise<ApiResponse<{ count: number; results: ExactRubricResult[] }>> => {
    try {
      let sql = `SELECT chapter, main_rubric, sub_condition, remedy_json, source
                  FROM repertory_entries
                  WHERE LOWER(chapter) = LOWER(?) AND LOWER(main_rubric) = LOWER(?)`;
      const params: unknown[] = [chapter, mainRubric];

      if (subCondition) {
        sql += ` AND LOWER(sub_condition) = LOWER(?)`;
        params.push(subCondition);
      }

      if (source && source.toLowerCase() !== 'both') {
        sql += ` AND LOWER(source) = LOWER(?)`;
        params.push(source);
      }

      const rows = await query<{
        chapter: string;
        main_rubric: string;
        sub_condition: string;
        remedy_json: string;
        source: string;
      }>(sql, params);

      const results: ExactRubricResult[] = rows.map((row) => ({
        chapter: row.chapter,
        main_rubric: row.main_rubric,
        sub_condition: row.sub_condition,
        remedies: JSON.parse(row.remedy_json || '[]') as RemedyDetail[],
        source: row.source,
      }));

      return { success: true, data: { count: results.length, results } };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch exact rubric';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  searchRubrics: async (
    queryText: string,
    source?: string
  ): Promise<ApiResponse<{ query: string; count: number; results: Record<string, unknown>[] }>> => {
    try {
      // Use FTS5 MATCH for fast search, with fallback to LIKE
      let sql: string;
      const params: unknown[] = [];

      // Try FTS5 first - split query into tokens for prefix matching
      const searchTerms = queryText
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => `"${t}"*`)
        .join(' ');

      sql = `SELECT r.chapter, r.main_rubric, r.sub_condition, r.remedy_count,
                    r.remedy_json, r.source
             FROM repertory_entries r
             JOIN repertory_entries_fts fts ON r.id = fts.rowid
             WHERE fts.search_text MATCH ?`;
      params.push(searchTerms);

      if (source && source.toLowerCase() !== 'both') {
        sql += ` AND LOWER(r.source) = LOWER(?)`;
        params.push(source);
      }

      sql += ` ORDER BY LENGTH(r.search_text) ASC, r.remedy_count DESC LIMIT 100`;

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
        let fallbackSql = `SELECT chapter, main_rubric, sub_condition, remedy_count,
                                  remedy_json, source
                           FROM repertory_entries
                           WHERE LOWER(search_text) LIKE ?`;
        const fallbackParams: unknown[] = [`%${queryText.toLowerCase()}%`];

        if (source && source.toLowerCase() !== 'both') {
          fallbackSql += ` AND LOWER(source) = LOWER(?)`;
          fallbackParams.push(source);
        }

        fallbackSql += ` ORDER BY LENGTH(search_text) ASC, remedy_count DESC LIMIT 100`;
        rows = await query(fallbackSql, fallbackParams);
      }

      const results = rows.map((row) => ({
        chapter: row.chapter,
        main_rubric: row.main_rubric,
        sub_condition: row.sub_condition,
        remedy_count: row.remedy_count,
        remedies: JSON.parse(row.remedy_json || '[]'),
        source: row.source,
        similarity_score: 1.0,
        confidence: row.remedy_count > 5 ? 'HIGH' : 'MEDIUM',
      }));

      return {
        success: true,
        data: { query: queryText, count: results.length, results },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to search rubrics';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getRemedies: async (): Promise<ApiResponse<{ count: number; remedies: string[] }>> => {
    try {
      const rows = await query<{ name: string }>(
        'SELECT name FROM unique_remedies ORDER BY name'
      );
      return {
        success: true,
        data: { count: rows.length, remedies: rows.map((r) => r.name) },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch remedies';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getRubricsByRemedy: async (
    remedyName: string,
    source?: string
  ): Promise<
    ApiResponse<{ remedy: string; count: number; rubrics: RemedyRubricResult[] }>
  > => {
    try {
      // Normalize remedy name
      const cleanRemedy = remedyName.endsWith('.') ? remedyName : `${remedyName}.`;

      let sql = `SELECT chapter, main_rubric, sub_condition, remedy_json, source
                  FROM repertory_entries WHERE remedy_json LIKE ?`;
      const params: unknown[] = [`%"name":"${cleanRemedy}"%`];

      if (source && source.toLowerCase() !== 'both') {
        sql += ` AND LOWER(source) = LOWER(?)`;
        params.push(source);
      }

      const rows = await query<{
        chapter: string;
        main_rubric: string;
        sub_condition: string;
        remedy_json: string;
        source: string;
      }>(sql, params);

      const rubrics: RemedyRubricResult[] = rows.map((row) => {
        const remedies: RemedyDetail[] = JSON.parse(row.remedy_json || '[]');
        const match = remedies.find(
          (r) => r.name.toLowerCase() === cleanRemedy.toLowerCase()
        );
        return {
          chapter: row.chapter,
          main_rubric: row.main_rubric,
          sub_condition: row.sub_condition,
          grade: match?.grade || 0,
          source: row.source,
        };
      });

      // Sort by grade desc
      rubrics.sort((a, b) => b.grade - a.grade);

      return {
        success: true,
        data: { remedy: remedyName, count: rubrics.length, rubrics },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch remedy rubrics';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },

  getStats: async (): Promise<ApiResponse<Record<string, unknown>>> => {
    try {
      const rows = await query<{
        source: string;
        total_entries: number;
        total_remedies: number;
        sections: number;
      }>(
        `SELECT source,
                SUM(remedy_count) as total_entries,
                COUNT(*) as total_remedies,
                COUNT(DISTINCT chapter) as sections
         FROM repertory_entries GROUP BY source`
      );

      const stats: Record<string, unknown> = {};
      for (const row of rows) {
        stats[row.source] = {
          total_remedy_entries: row.total_entries,
          sections: row.sections,
        };
      }

      return { success: true, data: stats };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch stats';
      return { success: false, error: { status: 500, message: msg, errors: null } };
    }
  },
};
