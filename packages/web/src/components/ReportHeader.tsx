interface ReportSummary {
  errors: number;
  warnings: number;
  healthy: number;
}

interface ReportHeaderProps {
  totalDeals: number;
  summary: ReportSummary;
  generatedAt?: string;
}

function formatGeneratedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ReportHeader({ totalDeals, summary, generatedAt }: ReportHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Pipeline integrity report</h2>
        {generatedAt && (
          <p className="text-sm text-gray-500">Generated {formatGeneratedAt(generatedAt)}</p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total deals</p>
          <p className="text-2xl font-semibold text-gray-900">{totalDeals}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-sm font-medium text-red-700">Errors</p>
          <p className="text-2xl font-semibold text-red-900">{summary.errors}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <p className="text-sm font-medium text-amber-700">Warnings</p>
          <p className="text-2xl font-semibold text-amber-900">{summary.warnings}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm font-medium text-green-700">Healthy</p>
          <p className="text-2xl font-semibold text-green-900">{summary.healthy}</p>
        </div>
      </div>
    </div>
  );
}
