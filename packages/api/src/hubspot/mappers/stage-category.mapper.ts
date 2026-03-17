import { StageCategory } from '@winnow/core';

export function mapStageCategory(
  stageName: string,
  probability: number,
  isClosed: boolean,
  isWon: boolean,
): StageCategory {
  if (isClosed && isWon) return 'closed_won';
  if (isClosed && !isWon) return 'closed_lost';

  const name = stageName.toLowerCase();

  if (/contract|legal|sign|closing|final|approval/i.test(name)) return 'closing';
  if (/proposal|quote|pricing|negotiat|commercial/i.test(name)) return 'proposal';
  if (/demo|eval|poc|pilot|proof|trial|present|solution/i.test(name)) return 'evaluation';
  if (/qualify|discovery|discover|prospect|intro|connect|outreach|mql/i.test(name)) return 'qualification';

  if (probability >= 80) return 'closing';
  if (probability >= 50) return 'proposal';
  if (probability >= 20) return 'evaluation';
  return 'qualification';
}
