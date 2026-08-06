import { describe, expect, it } from 'vitest';
import {
  adToBs, addBSDays, addBSMonths, assertBSDate, assertBSMonth, bsDateKey, bsToAd, bsToDayOffset,
  compareBS, createBSDate, dayOffsetToBS, daysInBSMonth, DEFAULT_CALENDAR_DATA, extendCalendarData,
  formatBS, formatBSMonth, getBSMonthGrid, getBSWeekday, isDateDisabled, isValidBSDate,
  MAX_AD_DATE, MAX_BS_DATE, MIN_AD_DATE, MIN_BS_DATE, type CalendarYearData,
} from '../src/core/index';

// Synthetic test data only. These are NOT verified month lengths for the named years.
const months = [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30];
const future = { year: 2091, month: 1, day: 1 };
const past = { year: 1999, month: 12, day: 30 };
const dayMS = 86_400_000;

describe('extendCalendarData', () => {
  it('accepts 2120 only when every intervening year is supplied', () => {
    expect(() => extendCalendarData([{ year: 2120, months }])).toThrow(expect.objectContaining({ code: 'INVALID_CALENDAR_DATA' }));
    const data = extendCalendarData(Array.from({ length: 30 }, (_, index) => ({ year: 2091 + index, months })));
    const date = { year: 2120, month: 1, day: 1 };
    expect(isValidBSDate(date, data)).toBe(true);
    expect(adToBs(bsToAd(date, data), data)).toEqual(date);
    expect(isValidBSDate(date)).toBe(false);
  });

  it('appends, prepends and chains unsorted complete consecutive years without changing bundled data', () => {
    const first = extendCalendarData([{ year: 2091, months }, { year: 1999, months }]);
    const second = extendCalendarData([{ year: 2093, months }, { year: 1998, months }, { year: 2092, months }], first);
    expect(first.minBSYear).toBe(1999);
    expect(first.maxBSYear).toBe(2091);
    expect(second.minBSYear).toBe(1998);
    expect(second.maxBSYear).toBe(2093);
    expect(second.supportedDays).toBe(DEFAULT_CALENDAR_DATA.supportedDays + 5 * 365);
    expect(DEFAULT_CALENDAR_DATA.minBSYear).toBe(2000);
    expect(DEFAULT_CALENDAR_DATA.maxBSYear).toBe(2090);
    expect(extendCalendarData([], first)).toBe(first);
    expect(() => bsToAd(future)).toThrow(expect.objectContaining({ code: 'OUT_OF_RANGE' }));
    expect(() => bsToAd(past)).toThrow(expect.objectContaining({ code: 'OUT_OF_RANGE' }));
  });

  it('keeps the established anchor and every bundled AD mapping intact after prepending years', () => {
    const data = extendCalendarData([{ year: 1999, months }, { year: 2091, months }]);
    expect(bsToAd(MIN_BS_DATE, data).toISOString().slice(0, 10)).toBe(MIN_AD_DATE);
    expect(bsToAd(MAX_BS_DATE, data).toISOString().slice(0, 10)).toBe(MAX_AD_DATE);
    for (let offset = 0; offset < DEFAULT_CALENDAR_DATA.supportedDays; offset++) {
      const date = dayOffsetToBS(offset);
      if (bsToAd(date, data).getTime() !== bsToAd(date).getTime()) throw new Error(`Shifted ${bsDateKey(date)}`);
    }
    expect(bsToAd(past, data).getTime()).toBe(bsToAd(MIN_BS_DATE).getTime() - dayMS);
    expect(bsToAd(future, data).getTime()).toBe(bsToAd(MAX_BS_DATE).getTime() + dayMS);
  });

  it('round-trips the whole extended range, including new endpoints and day offsets', () => {
    const data = extendCalendarData([{ year: 2091, months }, { year: 1999, months }]);
    let last = data.epochMs - dayMS;
    for (let offset = 0; offset < data.supportedDays; offset++) {
      const date = dayOffsetToBS(offset, data);
      const ad = bsToAd(date, data);
      if (ad.getTime() !== last + dayMS || bsToDayOffset(adToBs(ad, data), data) !== offset) {
        throw new Error(`Extended round trip failed at offset ${offset}`);
      }
      last = ad.getTime();
    }
    expect(adToBs(data.minADDate, data)).toEqual(data.minBSDate);
    expect(adToBs(data.maxADDate, data)).toEqual(data.maxBSDate);
    expect(dayOffsetToBS(data.supportedDays - 1, data)).toEqual(data.maxBSDate);
    expect(() => addBSDays(data.minBSDate, -1, data)).toThrow(expect.objectContaining({ code: 'OUT_OF_RANGE' }));
    expect(() => addBSDays(data.maxBSDate, 1, data)).toThrow(expect.objectContaining({ code: 'OUT_OF_RANGE' }));
  });

  it('makes extended dates usable by validation, arithmetic, formatting and grids', () => {
    const data = extendCalendarData([{ year: 2091, months }]);
    expect(isValidBSDate(future, data)).toBe(true);
    expect(isValidBSDate(future)).toBe(false);
    expect(() => assertBSDate(future, data)).not.toThrow();
    expect(() => assertBSMonth(future, data)).not.toThrow();
    expect(createBSDate(2091, 1, 1, data)).toEqual(future);
    expect(daysInBSMonth(2091, 3, data)).toBe(32);
    expect(compareBS(future, MAX_BS_DATE, data)).toBe(1);
    expect(addBSDays(MAX_BS_DATE, 1, data)).toEqual(future);
    expect(addBSMonths({ year: 2090, month: 12, day: 30 }, 1, data)).toEqual({ ...future, day: 30 });
    expect(formatBS(future, { calendarData: data, locale: 'ne' })).toBe('२०९१ वैशाख १');
    expect(formatBS(future, { calendarData: data, style: 'full' })).toMatch(/, 2091 Baisakh 1$/);
    expect(formatBSMonth(future, 'en', 'latin', data)).toBe('Baisakh 2091');
    expect(bsDateKey(future, data)).toBe('2091-01-01');
    expect(getBSWeekday(future, data)).toBe(bsToAd(future, data).getUTCDay());
    expect(isDateDisabled(future, { calendarData: data, min: future, max: future })).toBe(false);
    expect(isDateDisabled(future, { calendarData: data, disabledDates: [future] })).toBe(true);
    const grid = getBSMonthGrid(future, { calendarData: data, min: future, max: future });
    expect(grid.flat().filter(day => day && !day.isDisabled)).toHaveLength(1);
    // The former dataset endpoint is now an ordinary month with adjacent future days.
    const december = getBSMonthGrid(MAX_BS_DATE, { calendarData: data }).flat();
    expect(december.every(Boolean)).toBe(true);
    expect(december.some(day => day?.date.year === 2091)).toBe(true);
    expect(getBSMonthGrid(data.maxBSDate, { calendarData: data }).flat().some(day => day === null)).toBe(true);
  });

  it('copies and deeply freezes additions so later caller changes cannot alter conversions', () => {
    const supplied = [...months];
    const years = [{ year: 2091, months: supplied }];
    const data = extendCalendarData(years);
    const before = bsToAd(data.maxBSDate, data).getTime();
    supplied[0] = 29;
    supplied.push(32);
    years[0]!.year = 2120;
    expect(data.monthDays[data.monthDays.length - 1]).toEqual(months);
    expect(bsToAd(data.maxBSDate, data).getTime()).toBe(before);
    for (const item of [data, data.monthDays, ...data.monthDays, data.monthOffsets, data.minBSDate, data.maxBSDate]) {
      expect(Object.isFrozen(item)).toBe(true);
    }
    // No functions or module-local state: the same dataset can cross entry points / SSR boundaries.
    const serialized = JSON.parse(JSON.stringify(data)) as typeof data;
    expect(bsToAd(future, serialized)).toEqual(bsToAd(future, data));
    const chained = extendCalendarData([{ year: 2092, months }], serialized);
    expect(Object.isFrozen(chained.monthDays[0])).toBe(true);
    expect(chained.monthDays[0]).not.toBe(serialized.monthDays[0]);
  });

  it.each([
    ['a skipped future year', [{ year: 2092, months }]],
    ['a skipped past year', [{ year: 1998, months }]],
    ['a gap inside additions', [{ year: 2091, months }, { year: 2093, months }]],
    ['an existing year', [{ year: 2090, months }]],
    ['a duplicate addition', [{ year: 2091, months }, { year: 2091, months }]],
    ['a fractional year', [{ year: 2091.5, months }]],
    ['a non-finite year', [{ year: Infinity, months }]],
    ['a year too large', [{ year: 10000, months }]],
    ['a negative year', [{ year: -1, months }]],
    ['missing months', [{ year: 2091, months: months.slice(1) }]],
    ['extra months', [{ year: 2091, months: [...months, 30] }]],
    ['a sparse month array', [{ year: 2091, months: new Array<number>(12) }]],
    ['a fractional month length', [{ year: 2091, months: [30.5, ...months.slice(1)] }]],
    ['a non-finite month length', [{ year: 2091, months: [NaN, ...months.slice(1)] }]],
    ['a short month', [{ year: 2091, months: [28, ...months.slice(1)] }]],
    ['a long month', [{ year: 2091, months: [33, ...months.slice(1)] }]],
    ['an invalid year total', [{ year: 2091, months: Array.from({ length: 12 }, () => 30) }]],
  ])('rejects %s with a typed error and no partial changes', (_name, years) => {
    expect(() => extendCalendarData(years)).toThrow(expect.objectContaining({ code: 'INVALID_CALENDAR_DATA' }));
    expect(DEFAULT_CALENDAR_DATA.maxBSYear).toBe(2090);
    expect(isValidBSDate(future)).toBe(false);
  });

  it('rejects malformed JavaScript / JSON input without native TypeErrors', () => {
    for (const value of [null, {}, [null], new Array(1), [{ year: '2091', months }], [{ year: 2091, months: 'bad' }]]) {
      expect(() => extendCalendarData(value as unknown as CalendarYearData[])).toThrow(expect.objectContaining({ code: 'INVALID_CALENDAR_DATA' }));
    }
    const base = extendCalendarData([{ year: 2091, months }]);
    expect(() => extendCalendarData([{ year: 2092, months }, { year: 2093, months: [] }], base)).toThrow();
    expect(base.maxBSYear).toBe(2091);
    expect(extendCalendarData([{ year: 2092, months }], base).maxBSYear).toBe(2092);
  });
});
