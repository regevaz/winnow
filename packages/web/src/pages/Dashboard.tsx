import { useState, useEffect } from 'react';
import { useReports } from '../hooks/useReports';
import { ReportHeader } from '../components/ReportHeader';
import { FilterBar, type StatusFilter, type SortKey } from '../components/FilterBar';
import { DealsTable } from '../components/DealsTable';

export function Dashboard() {
  const { report, loading, error, loadLatestReport, runValidation, pipelineId } = useReports();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('status');

  useEffect(() => {
    loadLatestReport(pipelineId);
  }, [loadLatestReport, pipelineId]);

  const handleRunValidation = () => {
    runValidation(pipelineId);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Winnow</h1>
            <p className="text-xl text-gray-600 mt-2">Revenue Pipeline Validator</p>
          </div>
          <button
            type="button"
            onClick={handleRunValidation}
            disabled={loading}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Running…' : 'Run Validation'}
          </button>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {loading && !report && (
          <div className="py-12 text-center text-gray-500">Loading report…</div>
        )}

        {report && (
          <>
            <ReportHeader
              totalDeals={report.totalDeals}
              summary={report.summary}
              generatedAt={report.generatedAt}
            />
            <FilterBar
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortKey={sortKey}
              onSortKeyChange={setSortKey}
            />
            <DealsTable
              results={report.dealResults}
              statusFilter={statusFilter}
              sortKey={sortKey}
            />
          </>
        )}

        {!loading && !report && !error && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <p className="mb-4">No reports yet.</p>
            <button
              type="button"
              onClick={handleRunValidation}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
            >
              Run Validation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
