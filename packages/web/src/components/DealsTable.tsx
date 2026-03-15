import type { DealValidationResult } from '../api/client';
import { DealRow } from './DealRow';
import type { StatusFilter, SortKey } from './FilterBar';
import { useState, useMemo } from 'react';

const STATUS_ORDER: Record<'error' | 'warning' | 'healthy', number> = {
  error: 0,
  warning: 1,
  healthy: 2,
};

function filterResults(
  results: DealValidationResult[],
  statusFilter: StatusFilter
): DealValidationResult[] {
  if (statusFilter === 'all') return results;
  return results.filter((r) => r.status === statusFilter);
}

function sortResults(
  results: DealValidationResult[],
  sortKey: SortKey
): DealValidationResult[] {
  const copy = [...results];
  if (sortKey === 'status') {
    copy.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    return copy;
  }
  if (sortKey === 'amount') {
    copy.sort((a, b) => b.deal.amount - a.deal.amount);
    return copy;
  }
  if (sortKey === 'closeDate') {
    copy.sort((a, b) => {
      const da = new Date((a.deal as { closeDate?: string | Date }).closeDate ?? 0).getTime();
      const db = new Date((b.deal as { closeDate?: string | Date }).closeDate ?? 0).getTime();
      return da - db;
    });
    return copy;
  }
  return copy;
}

interface DealsTableProps {
  results: DealValidationResult[];
  statusFilter: StatusFilter;
  sortKey: SortKey;
}

export function DealsTable({ results, statusFilter, sortKey }: DealsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => sortResults(filterResults(results, statusFilter), sortKey),
    [results, statusFilter, sortKey]
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Deal
            </th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Amount
            </th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Stage
            </th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Owner
            </th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Status
            </th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Close date
            </th>
            <th className="py-3 px-4 text-left w-8" aria-hidden />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filtered.map((result) => (
            <DealRow
              key={result.deal.id}
              result={result}
              expanded={expandedId === result.deal.id}
              onToggle={() =>
                setExpandedId((id) => (id === result.deal.id ? null : result.deal.id))
              }
            />
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div className="py-8 text-center text-gray-500 text-sm">
          No deals match the current filter.
        </div>
      )}
    </div>
  );
}
