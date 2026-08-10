import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBSCalendar, type UseBSCalendarOptions } from '../src/react';
import { addBSDays, bsDateKey, bsToAd, extendCalendarData, getBSWeekday, MAX_BS_DATE, MIN_BS_DATE } from '../src/core/index';

afterEach(cleanup);
const initial = { year: 2082, month: 1, day: 1 };

function Calendar(props: UseBSCalendarOptions) {
  const calendar = useBSCalendar({ defaultValue: initial, ...props });
  return <section><button {...calendar.getPreviousMonthProps()}>Previous</button><h2 aria-live="polite">{calendar.monthLabel}</h2><button {...calendar.getNextMonthProps()}>Next</button>
    <div {...calendar.getGridProps()}><div role="row">{calendar.weekdays.map(day => <span role="columnheader" key={day.weekday}>{day.label}</span>)}</div>
      {calendar.weeks.map((week, index) => <div role="row" key={index}>{week.map((day, col) => day ? <button {...calendar.getDayProps(day)} key={day.key} data-key={day.key}>{day.label}</button> : <span role="gridcell" aria-disabled="true" key={col} />)}</div>)}
    </div><output data-testid="selection">{calendar.selected ? bsDateKey(calendar.selected, props.calendarData) : 'empty'}</output></section>;
}
const dateCell = (key: string) => document.querySelector<HTMLButtonElement>(`[data-key="${key}"]`)!;

describe('headless calendar', () => {
  it('navigates and selects appended/prepended years using custom data and localized labels', async () => {
    // Synthetic fixtures only; not verified historical/future month lengths.
    const months = [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30];
    const calendarData = extendCalendarData([{ year: 1999, months }, { year: 2091, months }]);
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Calendar calendarData={calendarData} defaultValue={MAX_BS_DATE} onChange={onChange} />);
    expect((screen.getByRole('button', { name: 'Next month' }) as HTMLButtonElement).disabled).toBe(false);
    act(() => dateCell('2090-12-30').focus());
    await user.keyboard('{ArrowRight}{Enter}');
    expect(document.activeElement).toBe(dateCell('2091-01-01'));
    expect(screen.getByRole('heading').textContent).toBe('Baisakh 2091');
    expect(screen.getByTestId('selection').textContent).toBe('2091-01-01');
    expect(onChange).toHaveBeenCalledWith({ year: 2091, month: 1, day: 1 });
    cleanup();
    render(<Calendar calendarData={calendarData} defaultValue={MIN_BS_DATE} locale="ne" />);
    act(() => dateCell('2000-01-01').focus());
    await user.keyboard('{ArrowLeft}{Enter}');
    expect(document.activeElement).toBe(dateCell('1999-12-30'));
    expect(screen.getByRole('heading').textContent).toBe('चैत १९९९');
    expect(screen.getByTestId('selection').textContent).toBe('1999-12-30');
    expect(dateCell('1999-12-30').getAttribute('aria-label')).toContain('१९९९ चैत ३०');
  });

  it('honors min/max, disabled dates and programmatic navigation in extended years', () => {
    const months = [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30];
    const calendarData = extendCalendarData([{ year: 2091, months }]);
    const min = { year: 2091, month: 1, day: 1 }, max = { ...min, day: 3 };
    const { result } = renderHook(() => useBSCalendar({ calendarData, min, max, disabledDates: [{ ...min, day: 2 }] }));
    expect(result.current.visibleMonth).toEqual({ year: 2091, month: 1 });
    expect(result.current.canGoToNextMonth).toBe(false);
    expect(result.current.canGoToPrevMonth).toBe(false);
    act(() => {
      expect(result.current.selectDate({ ...min, day: 2 })).toBe(false);
      expect(result.current.selectDate(max)).toBe(true);
      expect(result.current.goToMonth({ year: 2091, month: 2 })).toBe(false);
    });
    expect(result.current.selected).toEqual(max);
  });

  it('gives the grid one tab stop, no automatic focus, and selects with Enter/Space', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Calendar onChange={onChange} today={initial} />);
    expect(screen.getByRole('grid').getAttribute('lang')).toBe('en');
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    expect(screen.getAllByRole('gridcell').filter(cell => cell.tabIndex === 0)).toHaveLength(1);
    expect(document.activeElement).toBe(document.body);
    const first = dateCell('2082-01-01');
    expect(first.getAttribute('aria-current')).toBe('date');
    act(() => first.focus());
    await user.keyboard('{ArrowRight}{Enter}');
    expect(screen.getByTestId('selection').textContent).toBe('2082-01-02');
    expect(document.activeElement).toBe(dateCell('2082-01-02'));
    await user.keyboard('{ArrowRight} ');
    expect(screen.getByTestId('selection').textContent).toBe('2082-01-03');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('crosses month/year boundaries with actual DOM focus and clamps dataset endpoints', async () => {
    const user = userEvent.setup();
    render(<Calendar defaultValue={{ year: 2081, month: 12, day: 31 }} />);
    act(() => dateCell('2081-12-31').focus());
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(dateCell('2082-01-01'));
    expect(screen.getByRole('heading').textContent).toBe('Baisakh 2082');
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(dateCell('2081-12-31'));
    cleanup();
    render(<Calendar defaultValue={MIN_BS_DATE} />);
    act(() => dateCell(bsDateKey(MIN_BS_DATE)).focus());
    await user.keyboard('{ArrowLeft}{PageUp}');
    expect(document.activeElement).toBe(dateCell(bsDateKey(MIN_BS_DATE)));
    expect((screen.getByRole('button', { name: 'Previous month' }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    render(<Calendar defaultValue={MAX_BS_DATE} />);
    act(() => dateCell(bsDateKey(MAX_BS_DATE)).focus());
    await user.keyboard('{ArrowRight}{PageDown}');
    expect(document.activeElement).toBe(dateCell(bsDateKey(MAX_BS_DATE)));
  });

  it('supports PageUp/Down, year jumps, Home/End and vertical arrows', async () => {
    const user = userEvent.setup();
    render(<Calendar weekStartsOn={1} />);
    act(() => dateCell('2082-01-01').focus());
    await user.keyboard('{PageDown}');
    expect(document.activeElement).toBe(dateCell('2082-02-01'));
    await user.keyboard('{PageUp}');
    expect(document.activeElement).toBe(dateCell('2082-01-01'));
    await user.keyboard('{Shift>}{PageDown}{/Shift}');
    expect(document.activeElement).toBe(dateCell('2083-01-01'));
    await user.keyboard('{Shift>}{PageUp}{/Shift}');
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(dateCell('2082-01-07'));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(dateCell('2082-01-01'));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(dateCell('2082-01-08'));
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(dateCell('2082-01-01'));
  });

  it('prevents disabled pointer, keyboard and programmatic selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Calendar onChange={onChange} min={initial} max={{ ...initial, day: 10 }} disabledDates={[{ ...initial, day: 2 }]} />);
    const disabled = dateCell('2082-01-02');
    await user.click(disabled);
    await user.keyboard('{Enter} ');
    expect(onChange).not.toHaveBeenCalled();
    expect(disabled.getAttribute('aria-disabled')).toBe('true');
    // Disabled days remain focusable to support screen reader discovery.
    expect(document.activeElement).toBe(disabled);
    await user.keyboard('{ArrowRight}{Enter}');
    expect(onChange).toHaveBeenCalledWith({ ...initial, day: 3 });
    await user.keyboard('{PageDown}');
    expect(document.activeElement).toBe(dateCell('2082-01-10'));
    const { result } = renderHook(() => useBSCalendar({ disabledDates: day => day.day === 1 }));
    act(() => expect(result.current.selectDate(initial)).toBe(false));
    expect(result.current.selected).toBe(null);
  });

  it('honors controlled values and external updates, including null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<Calendar value={null} onChange={onChange} initialMonth={initial} />);
    await user.click(dateCell('2082-01-01'));
    expect(onChange).toHaveBeenCalledWith(initial);
    expect(screen.getByTestId('selection').textContent).toBe('empty');
    rerender(<Calendar value={{ year: 2083, month: 4, day: 9 }} onChange={onChange} />);
    expect(screen.getByTestId('selection').textContent).toBe('2083-04-09');
    expect(screen.getByRole('heading').textContent).toBe('Shrawan 2083');
    rerender(<Calendar value={null} onChange={onChange} />);
    expect(screen.getByTestId('selection').textContent).toBe('empty');
  });

  it('updates limits, localizes ARIA labels, and keeps navigation buttons out of forms', () => {
    const { rerender } = render(<Calendar locale="ne" />);
    expect(screen.getByRole('grid').getAttribute('lang')).toBe('ne');
    expect(dateCell('2082-01-01').getAttribute('aria-label')).toBe('सोमबार, २०८२ वैशाख १');
    expect(screen.getByRole('button', { name: 'अर्को महिना' }).getAttribute('type')).toBe('button');
    rerender(<Calendar min={{ year: 2083, month: 1, day: 1 }} max={{ year: 2083, month: 1, day: 10 }} />);
    expect(screen.getByRole('heading').textContent).toBe('Baisakh 2083');
    expect(screen.getAllByRole('gridcell').filter(cell => cell.tabIndex === 0)).toHaveLength(1);
    expect((screen.getByRole('button', { name: 'Next month' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('supports predicate-disabled Saturdays and preserves click selection while navigating', () => {
    const { result } = renderHook(() => useBSCalendar({ defaultValue: initial, disabledDates: date => bsToAd(date).getUTCDay() === 6 }));
    const saturday = addBSDays(initial, 5);
    expect(getBSWeekday(saturday)).toBe(6);
    act(() => expect(result.current.selectDate(saturday)).toBe(false));
    act(() => { result.current.goToNextMonth(); });
    expect(result.current.selected).toEqual(initial);
    expect(result.current.visibleMonth).toEqual({ year: 2082, month: 2 });
  });

  it.each([false, true])('hydrates server markup without mismatches or focus stealing (extension: %s)', async extended => {
    const container = document.createElement('div');
    document.body.append(container);
    const date = extended ? { year: 2091, month: 1, day: 1 } : initial;
    const props = {
      defaultValue: date, today: date, locale: 'ne' as const,
      ...(extended ? { calendarData: extendCalendarData([{ year: 2091, months: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30] }]) } : {}),
    };
    container.innerHTML = renderToString(<Calendar {...props} />);
    const before = container.innerHTML;
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot>;
    const clientProps = JSON.parse(JSON.stringify(props)) as typeof props;
    await act(async () => { root = hydrateRoot(container, <Calendar {...clientProps} />, { onRecoverableError: error => errors.push(error) }); });
    expect(errors).toEqual([]);
    expect(container.innerHTML).toBe(before);
    expect(document.activeElement).toBe(document.body);
    act(() => root!.unmount());
    container.remove();
  });
});
