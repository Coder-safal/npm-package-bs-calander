import { describe, expect, it } from 'vitest';
import {
  adToBs, addBSDays, addBSMonths, BSCalendarError, BS_MONTH_DAYS, bsToAd, bsToDayOffset,
  compareBS, createBSDate, dayOffsetToBS, daysInBSMonth, formatBS, formatBSMonth,
  getBSMonthGrid, getBSWeekday, getWeekdays, isDateDisabled, isValidBSDate,
  MAX_AD_DATE, MAX_BS_DATE, MIN_AD_DATE, MIN_BS_DATE, SUPPORTED_DAYS, toDevanagari, toLatinDigits,
} from '../src/core/index';

describe('calendar data and conversions', () => {
  it('has 91 complete years of immutable month lengths', () => {
    expect(BS_MONTH_DAYS).toHaveLength(91);
    expect(Object.isFrozen(BS_MONTH_DAYS)).toBe(true);
    for (const year of BS_MONTH_DAYS) {
      expect(year).toHaveLength(12);
      expect(Object.isFrozen(year)).toBe(true);
      expect(year.every(days => days >= 29 && days <= 32)).toBe(true);
      expect([365, 366]).toContain(year.reduce((sum, days) => sum + days, 0));
    }
  });

  it('round-trips every supported day in both directions, maintaining weekday continuity', () => {
    let previous = new Date(`${MIN_AD_DATE}T00:00:00Z`).getTime() - 86_400_000;
    for (let offset = 0; offset < SUPPORTED_DAYS; offset++) {
      const bs = dayOffsetToBS(offset);
      const ad = bsToAd(bs);
      if (ad.getTime() !== previous + 86_400_000 || bsToDayOffset(adToBs(ad)) !== offset || bsToDayOffset(adToBs(ad.toISOString().slice(0, 10))) !== offset) {
        throw new Error(`Conversion mismatch at ${JSON.stringify(bs)}`);
      }
      previous = ad.getTime();
    }
    expect(dayOffsetToBS(0)).toEqual(MIN_BS_DATE);
    expect(dayOffsetToBS(SUPPORTED_DAYS - 1)).toEqual(MAX_BS_DATE);
    expect(new Date(previous).toISOString().slice(0, 10)).toBe(MAX_AD_DATE);
  });

  it.each([
    ['1943-04-14', { year: 2000, month: 1, day: 1 }],
    ['2025-04-14', { year: 2082, month: 1, day: 1 }],
    ['2025-05-01', { year: 2082, month: 1, day: 18 }],
    ['2025-05-29', { year: 2082, month: 2, day: 15 }],
    ['2025-09-19', { year: 2082, month: 6, day: 3 }],
    ['2025-10-02', { year: 2082, month: 6, day: 16 }],
    ['2025-10-27', { year: 2082, month: 7, day: 10 }],
    ['2026-01-30', { year: 2082, month: 10, day: 16 }],
    ['2026-02-19', { year: 2082, month: 11, day: 7 }],
  ])('matches independently published fixture %s', (ad, bs) => {
    // Sources and exclusions for publication typos: docs/calendar-data.md.
    expect(adToBs(ad)).toEqual(bs);
    expect(bsToAd(bs).toISOString().slice(0, 10)).toBe(ad);
  });

  it('uses UTC calendar fields regardless of time or system timezone', () => {
    expect(adToBs(new Date('2025-04-14T23:59:59Z'))).toEqual({ year: 2082, month: 1, day: 1 });
    expect(adToBs(new Date('2025-04-14T00:00:00+05:45'))).toEqual({ year: 2081, month: 12, day: 31 });
    expect(bsToAd(MIN_BS_DATE).getUTCHours()).toBe(0);
  });

  it.each(['2025-02-29', '2024-02-30', '2025-00-01', '2025-13-01', '2025-04-00', '2025-4-14', '2025-04-14T00:00:00Z', 'bad'])('rejects invalid AD input %s', input => {
    expect(() => adToBs(input)).toThrow(BSCalendarError);
    try { adToBs(input); } catch (error) { expect((error as BSCalendarError).code).toBe('INVALID_DATE'); }
  });

  it('rejects invalid, fractional and out-of-range dates', () => {
    for (const date of [{ year: 1999, month: 1, day: 1 }, { year: 2091, month: 1, day: 1 }, { year: 2082, month: 0, day: 1 }, { year: 2082, month: 13, day: 1 }, { year: 2082, month: 1, day: 0 }, { year: 2082, month: 1, day: 32 }, { year: 2082.5, month: 1, day: 1 }, { year: 2082, month: 1, day: NaN }]) {
      expect(isValidBSDate(date)).toBe(false);
      expect(() => bsToAd(date)).toThrow(BSCalendarError);
    }
    expect(isValidBSDate(null)).toBe(false);
    expect(isValidBSDate({ year: '2082', month: 1, day: 1 })).toBe(false);
    expect(() => adToBs(new Date(NaN))).toThrow(BSCalendarError);
    expect(() => adToBs('1943-04-13')).toThrow(expect.objectContaining({ code: 'OUT_OF_RANGE' }));
    expect(() => addBSDays(MAX_BS_DATE, 1)).toThrow(BSCalendarError);
    expect(() => dayOffsetToBS(0.5)).toThrow(BSCalendarError);
    expect(() => addBSMonths(MIN_BS_DATE, -1)).toThrow(BSCalendarError);
    expect(() => addBSDays(MIN_BS_DATE, 0.5)).toThrow(BSCalendarError);
    expect(isValidBSDate(createBSDate(2082, 1, 1))).toBe(true);
  });

  it('handles month/year transitions and clamps shorter months', () => {
    expect(addBSDays({ year: 2081, month: 12, day: 31 }, 1)).toEqual({ year: 2082, month: 1, day: 1 });
    expect(addBSMonths({ year: 2082, month: 2, day: 31 }, 1)).toEqual({ year: 2082, month: 3, day: 31 });
    expect(addBSMonths({ year: 2082, month: 5, day: 31 }, 1).day).toBe(daysInBSMonth(2082, 6));
    expect(compareBS(MIN_BS_DATE, MAX_BS_DATE)).toBe(-1);
  });
});

describe('formatting and month grids', () => {
  const date = { year: 2082, month: 1, day: 1 };
  it('formats Nepali/English names, digit overrides and full date labels', () => {
    expect(formatBS(date)).toBe('2082 Baisakh 1');
    expect(formatBS(date, { locale: 'ne' })).toBe('२०८२ वैशाख १');
    expect(formatBS(date, { locale: 'ne', digits: 'latin', style: 'short' })).toBe('2082-01-01');
    expect(formatBS(date, { style: 'full' })).toBe('Monday, 2082 Baisakh 1');
    expect(formatBSMonth(date, 'ne')).toBe('वैशाख २०८२');
    expect(toDevanagari('2026-10-28')).toBe('२०२६-१०-२८');
    expect(toLatinDigits('२०२६-१०-२८')).toBe('2026-10-28');
  });
  it('aligns weeks for every week start and only pads dataset boundaries with null', () => {
    for (const weekStartsOn of [0, 1, 2, 3, 4, 5, 6] as const) {
      const grid = getBSMonthGrid(date, { weekStartsOn });
      expect(grid).toHaveLength(6);
      expect(grid.flat()).toHaveLength(42);
      expect(getBSWeekday(grid[0]![0]!.date)).toBe(weekStartsOn);
      expect(grid.flat().filter(day => !day?.isOutsideMonth)).toHaveLength(daysInBSMonth(date.year, date.month));
      expect(getWeekdays('ne', weekStartsOn)[0]!.weekday).toBe(weekStartsOn);
    }
    expect(getBSMonthGrid(MIN_BS_DATE).flat().filter(day => day === null).length).toBeGreaterThan(0);
    expect(getBSMonthGrid(MAX_BS_DATE).flat().filter(day => day === null).length).toBeGreaterThan(0);
    expect(() => getBSMonthGrid(date, { min: MAX_BS_DATE, max: MIN_BS_DATE })).toThrow(BSCalendarError);
  });
  it('applies inclusive constraints, arrays, and disabled predicates', () => {
    const next = addBSDays(date, 1);
    expect(isDateDisabled(date, { min: date, max: date })).toBe(false);
    expect(isDateDisabled(next, { max: date })).toBe(true);
    expect(isDateDisabled(date, { disabledDates: [date] })).toBe(true);
    expect(isDateDisabled(date, { disabledDates: day => day.day === 1 })).toBe(true);
    const grid = getBSMonthGrid(date, { min: date, max: next });
    expect(grid.flat().filter(day => day && !day.isDisabled)).toHaveLength(2);
  });
});
