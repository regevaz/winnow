import type { ValidationSeverity } from '@winnow/core';

interface ValidationBadgeProps {
  status: 'error' | 'warning' | 'healthy';
  severity?: ValidationSeverity;
  label?: string;
}

const statusStyles: Record<'error' | 'warning' | 'healthy', string> = {
  error: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  healthy: 'bg-green-500 text-white',
};

export function ValidationBadge({ status, label }: ValidationBadgeProps) {
  const text = label ?? status;
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
      data-status={status}
    >
      {text}
    </span>
  );
}
