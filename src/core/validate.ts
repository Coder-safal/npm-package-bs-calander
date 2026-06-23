import { DEFAULT_CALENDAR_DATA, type CalendarData } from './extend-calendar-data';
import { BSCalendarError, type BSDate, type BSMonth, type ValidBSDate } from './types';

export function assertBSMonth(date: BSMonth, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): void {
  if (!date || !Number.isInteger(date.year) || !Number.isInteger(date.month) || date.month < 1 || date.month > 12) {
    throw new BSCalendarError('INVALID_DATE', 'Expected an integer BS year and month (1–12).');
  }
  if (date.year < calendarData.minBSYear || date.year > calendarData.maxBSYear) {
    throw new BSCalendarError('OUT_OF_RANGE', `Supported BS years: ${calendarData.minBSYear}–${calendarData.maxBSYear}.`);
  }
}

export function daysInBSMonth(year: number, month: number, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): number {
  assertBSMonth({ year, month }, calendarData);
  return calendarData.monthDays[year - calendarData.minBSYear]![month - 1]!;
}

export function assertBSDate(date: BSDate, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): asserts date is ValidBSDate {
  assertBSMonth(date, calendarData);
  if (!Number.isInteger(date.day) || date.day < 1 || date.day > daysInBSMonth(date.year, date.month, calendarData)) {
    throw new BSCalendarError('INVALID_DATE', 'Day does not exist in the specified BS month.');
  }
}

export function isValidBSDate(date: unknown, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): date is ValidBSDate {
  if (typeof date !== 'object' || date === null || !('year' in date) || !('month' in date) || !('day' in date)) return false;
  try { assertBSDate(date as BSDate, calendarData); return true; } catch { return false; }
}

export function createBSDate(year: number, month: number, day: number, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): ValidBSDate {
  const date = { year, month, day };
  assertBSDate(date, calendarData);
  return Object.freeze(date);
}

/** Chronological comparison, validated before comparing. */
export function compareBS(a: BSDate, b: BSDate, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): number {
  assertBSDate(a, calendarData); assertBSDate(b, calendarData);
  return Math.sign(a.year - b.year || a.month - b.month || a.day - b.day);
}
