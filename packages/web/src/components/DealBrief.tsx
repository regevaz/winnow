import { useState } from 'react';
import { api } from '../api/client';
import type { DealContextSummary } from '../api/client';

interface DealBriefProps {
  dealId: string;
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; data: DealContextSummary }
  | { status: 'error'; message: string };

function timeAgo(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export function DealBrief({ dealId }: DealBriefProps) {
  const [state, setState] = useState<State>({ status: 'idle' });

  async function load() {
    setState({ status: 'loading' });
    try {
      const data = await api.getDealSummary(dealId);
      setState({ status: 'loaded', data });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load' });
    }
  }

  if (state.status === 'idle') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); void load(); }}
        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded border border-blue-200 hover:border-blue-400 transition-colors"
      >
        Get AI Brief
      </button>
    );
  }

  if (state.status === 'loading') {
    return (
      <span className="text-xs text-gray-400 italic">Generating brief…</span>
    );
  }

  if (state.status === 'error') {
    return (
      <span className="text-xs text-red-500">{state.message}</span>
    );
  }

  const { data } = state;

  return (
    <div
      className="mt-3 border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">AI Deal Brief</span>
          {data.source === 'fallback' && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              Fallback (no activity data)
            </span>
          )}
          {data.confidence === 'low' && data.source === 'ai' && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              Low confidence
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">Generated {timeAgo(data.generatedAt)}</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Summary */}
        <p className="text-sm text-gray-800 leading-relaxed">{data.summary}</p>

        {/* Last activity */}
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last activity</span>
          <p className="text-sm text-gray-700 mt-0.5">{data.lastActivityContext}</p>
        </div>

        {/* Recommended action */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded px-3 py-2">
          <span className="text-blue-500 mt-0.5 shrink-0">→</span>
          <p className="text-sm text-blue-800">{data.recommendedAction}</p>
        </div>

        {/* Risk signals */}
        {data.riskSignals.length > 0 && (
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Risk signals</span>
            <ul className="mt-1 space-y-0.5">
              {data.riskSignals.map((signal, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>
                  {signal}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
