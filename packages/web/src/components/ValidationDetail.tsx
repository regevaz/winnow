import type { ValidationResult as CoreValidationResult } from '@winnow/core';
import { ValidationBadge } from './ValidationBadge';

interface ValidationDetailProps {
  validation: CoreValidationResult;
}

function formatDataPoint(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ValidationDetail({ validation }: ValidationDetailProps) {
  const severity = validation.severity as 'error' | 'warning' | 'info';
  const badgeStatus = severity === 'info' ? 'warning' : severity === 'error' ? 'error' : 'warning';

  return (
    <div className="border-l-2 border-gray-200 pl-3 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-gray-900">{validation.title}</span>
        <ValidationBadge status={badgeStatus} label={severity} />
      </div>
      <p className="text-sm text-gray-600 mt-1">{validation.description}</p>
      {Object.keys(validation.dataPoints).length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {Object.entries(validation.dataPoints).map(([key, value]) => (
            <span key={key} className="contents">
              <dt className="text-gray-500 font-medium">{key}:</dt>
              <dd className="text-gray-700">{formatDataPoint(value)}</dd>
            </span>
          ))}
        </dl>
      )}
    </div>
  );
}
