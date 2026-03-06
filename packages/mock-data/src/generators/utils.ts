import { SeniorityLevel } from '@winnow/core';

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function uuid(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Derive seniority level from contact title
 */
export function deriveSeniorityLevel(title: string | null): SeniorityLevel {
  if (!title) return 'unknown';
  const t = title.toLowerCase();

  // C-level
  if (/\b(ceo|cto|cfo|coo|cro|cmo|cio|ciso|chief)\b/.test(t)) return 'c_level';

  // VP
  if (/\b(vp|vice president|svp|evp)\b/.test(t)) return 'vp';

  // Director
  if (/\bdirector\b/.test(t)) return 'director';

  // Manager / Head of
  if (/\b(manager|head of|team lead)\b/.test(t)) return 'manager';

  return 'individual';
}
