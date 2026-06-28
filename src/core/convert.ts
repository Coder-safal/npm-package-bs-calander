import { DEFAULT_CALENDAR_DATA, type CalendarData } from './extend-calendar-data';
import { BSCalendarError, type BSDate, type ValidBSDate, type Weekday } from './types';
import { assertBSDate, createBSDate, daysInBSMonth } from './validate';

const DAY_MS = 86_400_000;
// These constants always describe the bundled data. Extended bounds live on CalendarData.
export const SUPPORTED_DAYS = DEFAULT_CALENDAR_DATA.supportedDays;
export const MIN_BS_DATE = createBSDate(DEFAULT_CALENDAR_DATA.minBSYear, 1, 1);
export const MAX_BS_DATE = createBSDate(DEFAULT_CALENDAR_DATA.maxBSYear, 12, DEFAULT_CALENDAR_DATA.maxBSDate.day);
export const MIN_AD_DATE = DEFAULT_CALENDAR_DATA.minADDate;
export const MAX_AD_DATE = DEFAULT_CALENDAR_DATA.maxADDate;

export function bsToDayOffset(date: BSDate, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): number {
  assertBSDate(date, calendarData);
  return calendarData.monthOffsets[(date.year - calendarData.minBSYear) * 12 + date.month - 1]! + date.day - 1;
}

export function dayOffsetToBS(offset: number, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): ValidBSDate {
  if (!Number.isInteger(offset)) throw new BSCalendarError('INVALID_DATE', 'Day offset must be an integer.');
  if (offset < 0 || offset >= calendarData.supportedDays) throw new BSCalendarError('OUT_OF_RANGE', 'Date is outside the supported calendar data.');
  const monthStarts = calendarData.monthOffsets;
  let low = 0, high = monthStarts.length - 1;
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if (monthStarts[mid]! <= offset) low = mid; else high = mid;
  }
  return createBSDate(calendarData.minBSYear + Math.floor(low / 12), low % 12 + 1, offset - monthStarts[low]! + 1, calendarData);
}

/** Date objects use UTC calendar fields; strings must be exact YYYY-MM-DD. */
export function adToBs(input: Date | string, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): ValidBSDate {
  let year: number, month: number, day: number;
  if (typeof input === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (!match) throw new BSCalendarError('INVALID_DATE', 'AD dates must use YYYY-MM-DD.');
    year = Number(match[1]); month = Number(match[2]); day = Number(match[3]);
  } else if (input instanceof Date && Number.isFinite(input.getTime())) {
    year = input.getUTCFullYear(); month = input.getUTCMonth() + 1; day = input.getUTCDate();
  } else {
    throw new BSCalendarError('INVALID_DATE', 'Expected a valid Date or YYYY-MM-DD string.');
  }
  // setUTCFullYear avoids Date.UTC's special handling of years 0–99.
  const utc = new Date(0);
  utc.setUTCFullYear(year, month - 1, day);
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    throw new BSCalendarError('INVALID_DATE', 'Invalid Gregorian calendar date.');
  }
  return dayOffsetToBS((utc.getTime() - calendarData.epochMs) / DAY_MS, calendarData);
}

/** Returns a new Date at UTC midnight. Use UTC getters when displaying it. */
export function bsToAd(date: BSDate, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): Date {
  return new Date(calendarData.epochMs + bsToDayOffset(date, calendarData) * DAY_MS);
}

export function addBSDays(date: BSDate, days: number, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): ValidBSDate {
  if (!Number.isInteger(days)) throw new BSCalendarError('INVALID_DATE', 'Day count must be an integer.');
  return dayOffsetToBS(bsToDayOffset(date, calendarData) + days, calendarData);
}

/** Move by months, clamping the day to the destination month's length. */
export function addBSMonths(date: BSDate, months: number, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): ValidBSDate {
  assertBSDate(date, calendarData);
  if (!Number.isInteger(months)) throw new BSCalendarError('INVALID_DATE', 'Month count must be an integer.');
  const index = (date.year - calendarData.minBSYear) * 12 + date.month - 1 + months;
  const year = calendarData.minBSYear + Math.floor(index / 12), month = ((index % 12) + 12) % 12 + 1;
  return createBSDate(year, month, Math.min(date.day, daysInBSMonth(year, month, calendarData)), calendarData);
}

export function getBSWeekday(date: BSDate, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): Weekday {
  return bsToAd(date, calendarData).getUTCDay() as Weekday;
}
