'use client';

import { useBSCalendar } from '@coder-safal/bs-calendar/react';
import { formatBS, type BSDate } from '@coder-safal/bs-calendar';

export function Calendar({ initialDate }: { initialDate: BSDate }) {
  const calendar = useBSCalendar({ defaultValue: initialDate, locale: 'ne' });
  return <section className="calendar"><nav aria-label="Calendar navigation"><button {...calendar.getPreviousMonthProps()}>←</button><h2 aria-live="polite">{calendar.monthLabel}</h2><button {...calendar.getNextMonthProps()}>→</button></nav>
    <div {...calendar.getGridProps()}><div role="row" className="week">{calendar.weekdays.map(day => <span role="columnheader" aria-label={day.fullLabel} key={day.weekday}>{day.label}</span>)}</div>
      {calendar.weeks.map((week, index) => <div role="row" className="week" key={index}>{week.map((day, column) => day ? <button {...calendar.getDayProps(day)} key={day.key}>{day.label}</button> : <span role="gridcell" aria-disabled="true" key={column} />)}</div>)}
    </div><p aria-live="polite">{calendar.selected ? formatBS(calendar.selected, { locale: 'ne' }) : 'Select a date'}</p>
  </section>;
}
