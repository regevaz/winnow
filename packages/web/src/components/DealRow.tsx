import type { Deal } from '@winnow/core';
import { ValidationBadge } from './ValidationBadge';
import { ValidationDetail } from './ValidationDetail';
import type { DealValidationResult } from '../api/client';

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString();
}

interface DealRowProps {
  result: DealValidationResult;
  expanded: boolean;
  onToggle: () => void;
}

export function DealRow({ result, expanded, onToggle }: DealRowProps) {
  const { deal, validations, status } = result;
  const dealAny = deal as Deal & { closeDate?: string | Date };
  const closeDate = dealAny.closeDate;

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
          expanded ? 'bg-gray-50' : ''
        }`}
      >
        <td className="py-3 px-4 text-left">
          <span className="font-medium text-gray-900">{deal.name}</span>
        </td>
        <td className="py-3 px-4 text-left text-gray-700">
          {formatAmount(deal.amount)}
        </td>
        <td className="py-3 px-4 text-left text-gray-700">
          {deal.stage.name}
        </td>
        <td className="py-3 px-4 text-left text-gray-700">
          {deal.ownerName}
        </td>
        <td className="py-3 px-4 text-left">
          <ValidationBadge status={status} />
        </td>
        <td className="py-3 px-4 text-left text-gray-700">
          {closeDate != null ? formatDate(closeDate) : '—'}
        </td>
        <td className="py-3 px-4 text-left">
          <span className="text-gray-400" aria-hidden>
            {expanded ? '▼' : '▶'}
          </span>
        </td>
      </tr>
      {expanded && validations.length > 0 && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="py-4 px-4">
            <div className="space-y-3 pl-2">
              <p className="text-sm font-medium text-gray-700">Validation details</p>
              {validations.map((v) => (
                <ValidationDetail key={v.validatorId} validation={v} />
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
