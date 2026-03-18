/**
 * API client for reports and validation.
 * Dates from API are ISO strings; we pass them through and format in the UI.
 */

import type {
  PipelineIntegrityReport,
  DealValidationResult,
  ValidationResult,
  DealContextSummary,
} from '@winnow/core';

export interface ReportListItem {
  id: string;
  pipelineId: string;
  generatedAt: string;
  summary: {
    errors: number;
    warnings: number;
    healthy: number;
  };
}

export interface ReportsListResponse {
  reports: ReportListItem[];
}

/** Shape of report used in the dashboard (from GET full report or POST validate) */
export interface ReportView {
  totalDeals: number;
  summary: { errors: number; warnings: number; healthy: number };
  dealResults: DealValidationResult[];
  generatedAt: string;
}

/** Stored report with full results (GET /api/reports/:id) or inline in list */
export interface FullReportResponse extends ReportListItem, ReportView {
  id: string;
  pipelineId: string;
}

/** Response from POST /api/validate */
export type ValidateResponse = PipelineIntegrityReport;

/** In dev we use Vite proxy; in production set VITE_API_URL (e.g. https://api.winnow.com) */
const API_BASE = typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status === 404 ? 'Not found' : text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getReports: (pipelineId: string) =>
    get<ReportsListResponse>(`/api/reports?pipelineId=${encodeURIComponent(pipelineId)}`),

  getReport: (id: string) =>
    get<FullReportResponse>(`/api/reports/${encodeURIComponent(id)}`),

  validate: (pipelineId: string) =>
    post<ValidateResponse>('/api/validate', { pipelineId }),

  getDealSummary: (dealId: string) =>
    get<DealContextSummary>(`/api/deals/${encodeURIComponent(dealId)}/summary`),
};

export type { DealValidationResult, ValidationResult, DealContextSummary };
