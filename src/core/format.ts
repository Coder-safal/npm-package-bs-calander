import { en } from '../locales/en';
import { ne } from '../locales/ne';
import { getBSWeekday } from './convert';
import { DEFAULT_CALENDAR_DATA, type CalendarData } from './extend-calendar-data';
import type { BSDate, BSMonth, Digits, Locale, Weekday } from './types';
import { assertBSDate, assertBSMonth } from './validate';

export const locales = { en, ne } as const;
const DEVANAGARI = '०१२३४५६७८९';
export function toDevanagari(value: string | number): string {
  return String(value).replace(/[0-9]/g, digit => DEVANAGARI[Number(digit)]!);
}
export function toLatinDigits(value: string | number): string {
  return String(value).replace(/[०-९]/g, digit => String(DEVANAGARI.indexOf(digit)));
}
export function formatDigits(value: string | number, digits: Digits = 'latin'): string {
  return digits === 'devanagari' ? toDevanagari(value) : toLatinDigits(value);
}
export interface FormatBSOptions { locale?: Locale; digits?: Digits; style?: 'long' | 'short' | 'full'; calendarData?: CalendarData }
export function formatBS(date: BSDate, options: FormatBSOptions = {}): string {
  const calendarData = options.calendarData ?? DEFAULT_CALENDAR_DATA;
  assertBSDate(date, calendarData);
  const { locale = 'en', digits = locale === 'ne' ? 'devanagari' : 'latin', style = 'long' } = options;
  const names = locales[locale];
  const text = style === 'short' ? `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}` :
    `${style === 'full' ? `${names.weekdays[getBSWeekday(date, calendarData)]}, ` : ''}${date.year} ${names.months[date.month - 1]} ${date.day}`;
  return formatDigits(text, digits);
}
export function formatBSMonth(month: BSMonth, locale: Locale = 'en', digits: Digits = locale === 'ne' ? 'devanagari' : 'latin', calendarData: CalendarData = DEFAULT_CALENDAR_DATA): string {
  assertBSMonth(month, calendarData);
  return formatDigits(`${locales[locale].months[month.month - 1]} ${month.year}`, digits);
}
export function bsDateKey(date: BSDate, calendarData: CalendarData = DEFAULT_CALENDAR_DATA): string {
  return formatBS(date, { style: 'short', digits: 'latin', calendarData });
}
export function getWeekdays(locale: Locale = 'en', weekStartsOn: Weekday = 0) {
  return Array.from({ length: 7 }, (_, index) => {
    const weekday = (index + weekStartsOn) % 7 as Weekday;
    return { weekday, label: locales[locale].weekdaysShort[weekday], fullLabel: locales[locale].weekdays[weekday] };
  });
}
