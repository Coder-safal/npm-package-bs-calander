'use client';

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type KeyboardEvent, type RefCallback } from 'react';
import {
  addBSMonths, assertBSDate, assertBSMonth, assertConstraints, bsDateKey, bsToDayOffset, compareBS,
  createBSDate, dayOffsetToBS, daysInBSMonth, formatBS, formatBSMonth, formatDigits, getBSMonthGrid,
  getBSWeekday, getWeekdays, isDateDisabled, locales, DEFAULT_CALENDAR_DATA,
  type BSDate, type BSMonth, type CalendarDay, type DateConstraints, type Digits, type Locale, type Weekday,
} from '../core/index';

export interface UseBSCalendarOptions extends DateConstraints {
  /** undefined is uncontrolled; null is a controlled empty selection. */
  value?: BSDate | null;
  defaultValue?: BSDate;
  onChange?: (date: BSDate) => void;
  initialMonth?: BSMonth;
  /** Pass the same explicit date on the server and client to mark today. */
  today?: BSDate;
  locale?: Locale;
  digits?: Digits;
  weekStartsOn?: Weekday;
}

export interface BSDay extends CalendarDay {
  readonly label: string;
  readonly isSelected: boolean;
  readonly isToday: boolean;
}

export interface DayProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref: RefCallback<HTMLButtonElement>;
  'data-selected': 'true' | undefined;
  'data-outside-month': 'true' | undefined;
  'data-today': 'true' | undefined;
}

const sameMonth = (a: BSMonth, b: BSMonth) => a.year === b.year && a.month === b.month;
const monthIndex = (month: BSMonth) => month.year * 12 + month.month - 1;

/** Headless, single-date BS calendar. Spread prop getters to retain accessibility. */
export function useBSCalendar(options: UseBSCalendarOptions = {}) {
  const calendarData = options.calendarData ?? DEFAULT_CALENDAR_DATA;
  const { locale = 'en', digits = locale === 'ne' ? 'devanagari' : 'latin', weekStartsOn = 0 } = options;
  assertConstraints(options);
  if (options.value) assertBSDate(options.value, calendarData);
  if (options.defaultValue) assertBSDate(options.defaultValue, calendarData);
  if (options.today) assertBSDate(options.today, calendarData);
  if (options.initialMonth) assertBSMonth(options.initialMonth, calendarData);
  if (Array.isArray(options.disabledDates)) options.disabledDates.forEach(date => assertBSDate(date, calendarData));

  const min = options.min ?? calendarData.minBSDate, max = options.max ?? calendarData.maxBSDate;
  const clamp = (date: BSDate): BSDate => compareBS(date, min, calendarData) < 0 ? min : compareBS(date, max, calendarData) > 0 ? max : date;
  const [internalValue, setInternalValue] = useState<BSDate | null>(() => options.defaultValue ? createBSDate(options.defaultValue.year, options.defaultValue.month, options.defaultValue.day, calendarData) : null);
  const selected = options.value === undefined ? internalValue : options.value;
  const initial = () => clamp(options.initialMonth ? { ...options.initialMonth, day: 1 } : selected ?? options.today ?? min);
  const [monthState, setMonthState] = useState<BSMonth>(initial);
  const [focusedDate, setFocusedDate] = useState<BSDate>(initial);
  const visibleMonth = { year: monthState.year, month: monthState.month };
  if (monthIndex(visibleMonth) < monthIndex(min)) Object.assign(visibleMonth, { year: min.year, month: min.month });
  if (monthIndex(visibleMonth) > monthIndex(max)) Object.assign(visibleMonth, { year: max.year, month: max.month });

  const id = useId();
  const nodes = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef(false);
  const selectedKey = selected ? bsDateKey(selected, calendarData) : null;
  const lastSelectedKey = useRef(selectedKey);
  // Reflect external controlled selection changes, without overriding initialMonth on mount.
  useEffect(() => {
    if (selectedKey !== lastSelectedKey.current) {
      lastSelectedKey.current = selectedKey;
      if (selected) { setMonthState(clamp(selected)); setFocusedDate(clamp(selected)); }
    }
  }, [selectedKey, options.min?.year, options.min?.month, options.min?.day, options.max?.year, options.max?.month, options.max?.day]);

  const focusTarget = sameMonth(focusedDate, visibleMonth) ? clamp(focusedDate) : clamp({ ...visibleMonth, day: 1 });
  const focusKey = bsDateKey(focusTarget, calendarData);
  useEffect(() => {
    if (pendingFocus.current) {
      nodes.current.get(focusKey)?.focus();
      pendingFocus.current = false;
    }
  });

  const label = formatBSMonth(visibleMonth, locale, digits, calendarData);
  const todayKey = options.today ? bsDateKey(options.today, calendarData) : null;
  const weeks = getBSMonthGrid(visibleMonth, { ...options, weekStartsOn }).map(week => week.map(day => day ? {
    ...day, label: formatDigits(day.date.day, digits), isSelected: day.key === selectedKey, isToday: day.key === todayKey,
  } satisfies BSDay : null));

  function selectDate(date: BSDate): boolean {
    assertBSDate(date, calendarData);
    if (isDateDisabled(date, options)) return false;
    const next = createBSDate(date.year, date.month, date.day, calendarData);
    if (options.value === undefined) setInternalValue(next);
    setMonthState(next); setFocusedDate(next);
    options.onChange?.(next);
    return true;
  }

  function goToMonth(month: BSMonth): boolean {
    assertBSMonth(month, calendarData);
    if (monthIndex(month) < monthIndex(min) || monthIndex(month) > monthIndex(max)) return false;
    const next = clamp({ ...month, day: Math.min(focusTarget.day, daysInBSMonth(month.year, month.month, calendarData)) });
    setMonthState({ year: month.year, month: month.month }); setFocusedDate(next);
    return true;
  }
  const canGoToPrevMonth = monthIndex(visibleMonth) > monthIndex(min);
  const canGoToNextMonth = monthIndex(visibleMonth) < monthIndex(max);
  function goToPrevMonth(): boolean {
    return canGoToPrevMonth ? goToMonth(addBSMonths({ ...visibleMonth, day: 1 }, -1, calendarData)) : false;
  }
  function goToNextMonth(): boolean {
    return canGoToNextMonth ? goToMonth(addBSMonths({ ...visibleMonth, day: 1 }, 1, calendarData)) : false;
  }

  function onDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: BSDate) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const offset = bsToDayOffset(date, calendarData);
    const minOffset = bsToDayOffset(min, calendarData), maxOffset = bsToDayOffset(max, calendarData);
    let nextOffset: number;
    switch (event.key) {
      case 'ArrowLeft': nextOffset = offset - 1; break;
      case 'ArrowRight': nextOffset = offset + 1; break;
      case 'ArrowUp': nextOffset = offset - 7; break;
      case 'ArrowDown': nextOffset = offset + 7; break;
      case 'Home': nextOffset = offset - (getBSWeekday(date, calendarData) - weekStartsOn + 7) % 7; break;
      case 'End': nextOffset = offset + 6 - (getBSWeekday(date, calendarData) - weekStartsOn + 7) % 7; break;
      case 'PageUp':
      case 'PageDown': {
        const delta = (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1);
        const targetIndex = monthIndex(date) + delta;
        nextOffset = targetIndex < monthIndex(min) ? minOffset : targetIndex > monthIndex(max) ? maxOffset : bsToDayOffset(addBSMonths(date, delta, calendarData), calendarData);
        break;
      }
      default: return;
    }
    event.preventDefault();
    const next = dayOffsetToBS(Math.max(minOffset, Math.min(maxOffset, nextOffset)), calendarData);
    pendingFocus.current = true;
    setFocusedDate(next); setMonthState({ year: next.year, month: next.month });
  }

  function getDayProps(day: CalendarDay | BSDate): DayProps {
    const date = 'date' in day ? day.date : day;
    const key = bsDateKey(date, calendarData);
    const disabled = isDateDisabled(date, options);
    return {
      ref: node => { if (node) nodes.current.set(key, node); else nodes.current.delete(key); },
      id: `${id}-${key}`, type: 'button', role: 'gridcell', tabIndex: key === focusKey ? 0 : -1,
      'aria-label': formatBS(date, { locale, digits, style: 'full', calendarData }),
      'aria-selected': key === selectedKey, 'aria-disabled': disabled,
      'aria-current': key === todayKey ? 'date' : undefined,
      'data-selected': key === selectedKey ? 'true' : undefined,
      'data-outside-month': !sameMonth(date, visibleMonth) ? 'true' : undefined,
      'data-today': key === todayKey ? 'true' : undefined,
      onFocus: () => setFocusedDate(date),
      onClick: () => { selectDate(date); },
      onKeyDown: event => onDayKeyDown(event, date),
    };
  }

  function getGridProps(): HTMLAttributes<HTMLDivElement> {
    return { role: 'grid', 'aria-label': `${locales[locale].calendar}: ${label}`, 'aria-colcount': 7, 'aria-rowcount': 7, lang: locale };
  }
  function getPreviousMonthProps(): ButtonHTMLAttributes<HTMLButtonElement> {
    return { type: 'button', 'aria-label': locales[locale].previousMonth, disabled: !canGoToPrevMonth, onClick: goToPrevMonth };
  }
  function getNextMonthProps(): ButtonHTMLAttributes<HTMLButtonElement> {
    return { type: 'button', 'aria-label': locales[locale].nextMonth, disabled: !canGoToNextMonth, onClick: goToNextMonth };
  }
  return {
    weeks, weekdays: getWeekdays(locale, weekStartsOn), visibleMonth, selected, focusedDate: focusTarget,
    monthLabel: label, locale, digits, canGoToPrevMonth, canGoToNextMonth,
    goToMonth, goToPrevMonth, goToNextMonth, selectDate,
    getDayProps, getGridProps, getPreviousMonthProps, getNextMonthProps,
  };
}
