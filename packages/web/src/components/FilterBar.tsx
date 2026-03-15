export type StatusFilter = 'all' | 'error' | 'warning' | 'healthy';
export type SortKey = 'status' | 'amount' | 'closeDate';

interface FilterBarProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (f: StatusFilter) => void;
  sortKey: SortKey;
  onSortKeyChange: (s: SortKey) => void;
}

export function FilterBar({
  statusFilter,
  onStatusFilterChange,
  sortKey,
  onSortKeyChange,
}: FilterBarProps) {
  const btn = (f: StatusFilter, label: string) => (
    <button
      type="button"
      onClick={() => onStatusFilterChange(f)}
      className={`px-3 py-1.5 rounded text-sm font-medium ${
        statusFilter === f
          ? 'bg-gray-900 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Status:</span>
        {btn('all', 'All')}
        {btn('error', 'Errors')}
        {btn('warning', 'Warnings')}
        {btn('healthy', 'Healthy')}
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="text-sm text-gray-500">
          Sort by:
        </label>
        <select
          id="sort"
          value={sortKey}
          onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700"
        >
          <option value="status">Status (errors first)</option>
          <option value="amount">Amount</option>
          <option value="closeDate">Close date</option>
        </select>
      </div>
    </div>
  );
}
