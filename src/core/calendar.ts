import { bsToDayOffset, dayOffsetToBS, getBSWeekday } from './convert';
import { DEFAULT_CALENDAR_DATA, type CalendarData } from './extend-calendar-data';
import { bsDateKey } from './format';
import { assertBSMonth, compareBS } from './validate';
import { BSCalendarError, type BSDate, type BSMonth, type Weekday } from './types';

export interface DateConstraints {
  calendarData?: CalendarData;
  min?: BSDate;
  max?: BSDate;
  disabledDates?: readonly BSDate[] | ((date: BSDate) => boolean);
}
export interface CalendarDay {
  readonly date: BSDate;
  readonly key: string;
  readonly isOutsideMonth: boolean;
  readonly isDisabled: boolean;
}
export function assertConstraints({ min, max, calendarData = DEFAULT_CALENDAR_DATA }: DateConstraints): void {
  if (min) bsToDayOffset(min, calendarData);
  if (max) bsToDayOffset(max, calendarData);
  if (min && max && compareBS(min, max, calendarData) > 0) throw new BSCalendarError('INVALID_CONSTRAINT', 'min must be on or before max.');
}
export function isDateDisabled(date: BSDate, constraints: DateConstraints = {}): boolean {
  const { min, max, disabledDates, calendarData = DEFAULT_CALENDAR_DATA } = constraints;
  return Boolean((min && compareBS(date, min, calendarData) < 0) || (max && compareBS(date, max, calendarData) > 0) ||
    (typeof disabledDates === 'function' ? disabledDates(date) : disabledDates?.some(item => compareBS(date, item, calendarData) === 0)));
}
/** Six complete weeks; null cells only occur beyond the dataset's endpoints. */
export function getBSMonthGrid(month: BSMonth, options: DateConstraints & { weekStartsOn?: Weekday } = {}): readonly (readonly (CalendarDay | null)[])[] {
  const calendarData = options.calendarData ?? DEFAULT_CALENDAR_DATA;
  assertBSMonth(month, calendarData); assertConstraints(options);
  const weekStartsOn = options.weekStartsOn ?? 0;
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new BSCalendarError('INVALID_CONSTRAINT', 'weekStartsOn must be 0–6 (Sunday–Saturday).');
  }
  const first = { ...month, day: 1 };
  const offset = bsToDayOffset(first, calendarData) - (getBSWeekday(first, calendarData) - weekStartsOn + 7) % 7;
  return Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_, weekday) => {
    const dayOffset = offset + week * 7 + weekday;
    if (dayOffset < 0 || dayOffset >= calendarData.supportedDays) return null;
    const date = dayOffsetToBS(dayOffset, calendarData);
    return { date, key: bsDateKey(date, calendarData), isOutsideMonth: date.year !== month.year || date.month !== month.month, isDisabled: isDateDisabled(date, options) };
  }));
}
