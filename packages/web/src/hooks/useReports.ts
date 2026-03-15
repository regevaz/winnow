import { useState, useCallback } from 'react';
import { api, type ReportView } from '../api/client';

const DEFAULT_PIPELINE_ID = 'default';

export function useReports() {
  const [report, setReport] = useState<ReportView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatestReport = useCallback(async (pipelineId: string = DEFAULT_PIPELINE_ID) => {
    setLoading(true);
    setError(null);
    try {
      const { reports } = await api.getReports(pipelineId);
      if (reports.length === 0) {
        setReport(null);
        return;
      }
      const sorted = [...reports].sort(
        (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      );
      const latest = sorted[0];
      const full = await api.getReport(latest.id);
      setReport(full);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const runValidation = useCallback(async (pipelineId: string = DEFAULT_PIPELINE_ID) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.validate(pipelineId);
      setReport(result as unknown as ReportView);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    report,
    loading,
    error,
    loadLatestReport,
    runValidation,
    pipelineId: DEFAULT_PIPELINE_ID,
  };
}
