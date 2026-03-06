/**
 * Statistical utility functions for benchmark computation
 */

/**
 * Calculate the median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error('Cannot calculate median of empty array');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Calculate the percentile of an array of numbers
 * @param values Array of numbers
 * @param p Percentile (0-100)
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    throw new Error('Cannot calculate percentile of empty array');
  }

  if (p < 0 || p > 100) {
    throw new Error('Percentile must be between 0 and 100');
  }

  const sorted = [...values].sort((a, b) => a - b);

  if (p === 0) return sorted[0];
  if (p === 100) return sorted[sorted.length - 1];

  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  // Linear interpolation between two values
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Segment items into buckets based on a value extractor
 * @param items Array of items to segment
 * @param segments Array of segment definitions with min and max values
 * @param valueExtractor Function to extract the numeric value from an item
 * @returns Map of segment labels to arrays of items
 */
export function segmentize<T>(
  items: T[],
  segments: { min: number; max: number; label: string }[],
  valueExtractor: (item: T) => number
): Map<string, T[]> {
  const result = new Map<string, T[]>();

  // Initialize segments
  for (const segment of segments) {
    result.set(segment.label, []);
  }

  // Place each item in the appropriate segment
  for (const item of items) {
    const value = valueExtractor(item);

    for (const segment of segments) {
      if (value >= segment.min && value < segment.max) {
        result.get(segment.label)!.push(item);
        break;
      }
      // Handle edge case where value equals max of last segment
      if (segment.max === Infinity && value >= segment.min) {
        result.get(segment.label)!.push(item);
        break;
      }
    }
  }

  return result;
}
