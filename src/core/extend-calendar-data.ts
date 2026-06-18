import { BS_MONTH_DAYS, MIN_BS_YEAR } from './calendar-data';
import { BSCalendarError, type BSDate } from './types';

const DAY_MS = 86_400_000;

/** One complete year, with month lengths ordered from Baisakh through Chaitra. */
export interface CalendarYearData {
  readonly year: number;
  readonly months: readonly number[];
}

/** Immutable, serializable dataset shared by converters, validators, and React. */
export interface CalendarData {
  readonly minBSYear: number;
  readonly maxBSYear: number;
  readonly monthDays: readonly (readonly number[])[];
  readonly minBSDate: BSDate;
  readonly maxBSDate: BSDate;
  readonly minADDate: string;
  readonly maxADDate: string;
  readonly supportedDays: number;
  /** @internal UTC timestamp for the first supported day. */
  readonly epochMs: number;
  /** @internal Cumulative month offsets, including the exclusive end offset. */
  readonly monthOffsets: readonly number[];
}

function invalidData(message: string): never {
  throw new BSCalendarError('INVALID_CALENDAR_DATA', message);
}

function buildCalendarData(minBSYear: number, monthDays: readonly (readonly number[])[], epochMs: number): CalendarData {
  const monthOffsets = [0];
  for (const months of monthDays) {
    for (const days of months) monthOffsets.push(monthOffsets[monthOffsets.length - 1]! + days);
  }
  const supportedDays = monthOffsets[monthOffsets.length - 1]!;
  const maxBSYear = minBSYear + monthDays.length - 1;
  const firstAD = new Date(epochMs).toISOString();
  const lastAD = new Date(epochMs + (supportedDays - 1) * DAY_MS).toISOString();
  if (!/^\d{4}-/.test(firstAD) || !/^\d{4}-/.test(lastAD)) {
    invalidData('Extended dates must stay within AD years 0000–9999.');
  }
  return Object.freeze({
    minBSYear, maxBSYear,
    monthDays: Object.freeze(monthDays.map(months => Object.isFrozen(months) ? months : Object.freeze([...months]))),
    minBSDate: Object.freeze({ year: minBSYear, month: 1, day: 1 }),
    maxBSDate: Object.freeze({ year: maxBSYear, month: 12, day: monthDays[monthDays.length - 1]![11]! }),
    minADDate: firstAD.slice(0, 10), maxADDate: lastAD.slice(0, 10), supportedDays, epochMs,
    monthOffsets: Object.freeze(monthOffsets),
  });
}

/** Bundled BS 2000–2090 data. Extensions never mutate this dataset. */
export const DEFAULT_CALENDAR_DATA: CalendarData = buildCalendarData(MIN_BS_YEAR, BS_MONTH_DAYS, Date.UTC(1943, 3, 14));

/**
 * Return a new dataset with complete consecutive years prepended and/or appended.
 * Reject gaps, duplicates, existing years, and invalid month lengths atomically.
 * Structural validation cannot certify that the supplied calendar facts are correct.
 */
export function extendCalendarData(years: readonly CalendarYearData[], base: CalendarData = DEFAULT_CALENDAR_DATA): CalendarData {
  if (!Array.isArray(years)) invalidData('Expected an array of complete calendar years.');
  if (years.length === 0) return base;
  const rows = new Map(base.monthDays.map((months, index) => [base.minBSYear + index, months]));
  for (const entry of years) {
    if (!entry || !Number.isInteger(entry.year) || entry.year < 1 || entry.year > 9999) {
      invalidData('BS years must be integers between 1 and 9999.');
    }
    if (rows.has(entry.year)) invalidData(`BS year ${entry.year} already exists; extensions cannot replace years.`);
    if (!Array.isArray(entry.months) || entry.months.length !== 12) {
      invalidData(`BS year ${entry.year} must contain exactly 12 month lengths.`);
    }
    // Copy first: reject sparse arrays and keep later caller mutations isolated.
    const months = Array.from<unknown>(entry.months);
    if (!months.every((days): days is number => typeof days === 'number' && Number.isInteger(days) && days >= 29 && days <= 32)) {
      invalidData(`BS year ${entry.year} month lengths must be integers from 29 to 32.`);
    }
    const total = months.reduce((sum, days) => sum + days, 0);
    if (total !== 365 && total !== 366) invalidData(`BS year ${entry.year} must total 365 or 366 days.`);
    rows.set(entry.year, Object.freeze(months));
  }
  const sorted = [...rows.keys()].sort((a, b) => a - b);
  for (let index = 1; index < sorted.length; index++) {
    if (sorted[index] !== sorted[index - 1]! + 1) {
      invalidData(`Missing BS year ${sorted[index - 1]! + 1}; extensions must be consecutive with the existing range.`);
    }
  }
  let precedingDays = 0;
  for (const year of sorted) {
    if (year >= base.minBSYear) break;
    precedingDays += rows.get(year)!.reduce((sum, days) => sum + days, 0);
  }
  // Preserve the original anchor when extending into the past.
  return buildCalendarData(sorted[0]!, sorted.map(year => rows.get(year)!), base.epochMs - precedingDays * DAY_MS);
}
