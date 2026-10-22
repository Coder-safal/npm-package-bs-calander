# BS Calendar examples

All v0.1 examples are collected here. Months are **1–12** and BS dates are
date-only objects. Examples use the bundled BS **2000–2090** range unless they
explicitly pass custom data.

## Contents

1. [Install and run](#1-install-and-run)
2. [Convert BS and AD dates](#2-convert-bs-and-ad-dates)
3. [Format dates and digits](#3-format-dates-and-digits)
4. [Validate dates and handle errors](#4-validate-dates-and-handle-errors)
5. [Date arithmetic and bounds](#5-date-arithmetic-and-bounds)
6. [Generate a month grid without React](#6-generate-a-month-grid-without-react)
7. [Complete controlled React calendar](#7-complete-controlled-react-calendar)
8. [Uncontrolled state and navigation](#8-uncontrolled-state-and-navigation)
9. [Extend the dataset](#9-extend-the-dataset)
10. [Next.js App Router](#10-nextjs-app-router)
11. [CommonJS and types](#11-commonjs-and-types)
12. [Practice tasks and checks](#12-practice-tasks-and-checks)

## 1. Install and run

For an existing React application, use either package manager:

```sh
npm install @coder-safal/bs-calendar
```

```sh
pnpm add @coder-safal/bs-calendar
```

React and React DOM **18.2+ or 19** are required peers. This package is currently
built locally; registry commands become usable after publication. To practice
before publishing, run the examples in this repository or install its local
tarball in another React app.

From this repository, choose one column of commands for your checkout:

| Task | npm | pnpm |
| --- | --- | --- |
| Install dependencies | `npm install` | `pnpm install` |
| Reproducible CI install | `npm ci` | `pnpm install --frozen-lockfile` |
| Start Vite demo | `npm run dev` | `pnpm dev` |
| Start Next.js example | `npm run dev:next` | `pnpm dev:next` |
| Types, tests, library and Vite builds | `npm run check` | `pnpm check` |
| Next.js production build | `npm run build:next` | `pnpm build:next` |
| Create a local release tarball | `npm pack` | `pnpm pack` |

Use Node **22.12+** for development. The library output targets Node 20+.
For a separate practice app, run `npm pack` or `pnpm pack` here, then use
`npm install /absolute/path/coder-safal-bs-calendar-0.1.0.tgz` or
`pnpm add /absolute/path/coder-safal-bs-calendar-0.1.0.tgz` in that app.

## 2. Convert BS and AD dates

```ts
import { adToBs, bsToAd } from '@coder-safal/bs-calendar';

const bs = adToBs('2025-04-14');
console.log(bs); // { year: 2082, month: 1, day: 1 }

const ad = bsToAd({ year: 2082, month: 1, day: 1 });
console.log(ad.toISOString()); // 2025-04-14T00:00:00.000Z

// Date inputs use their UTC year/month/day; time is discarded.
console.log(adToBs(new Date('2025-04-14T20:00:00Z')));
// { year: 2082, month: 1, day: 1 }

console.log(new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric',
}).format(ad)); // 14 April 2025
```

Prefer exact `YYYY-MM-DD` input strings. A local `new Date(year, month, day)`
can represent the previous UTC day; it should not be used to pass a civil date.

To find today's civil date in Nepal, format it in Kathmandu first:

```ts
import { adToBs } from '@coder-safal/bs-calendar';

const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(new Date());
const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)!.value;
const today = adToBs(`${get('year')}-${get('month')}-${get('day')}`);
```

In Next.js, compute this on the server and pass the result to the client;
don't independently read the clock during server and client rendering.

## 3. Format dates and digits

```ts
import {
  formatBS, formatBSMonth, formatDigits, toDevanagari, toLatinDigits,
  getWeekdays, locales,
} from '@coder-safal/bs-calendar';

const date = { year: 2082, month: 1, day: 1 };

formatBS(date);                                      // 2082 Baisakh 1
formatBS(date, { locale: 'ne' });                     // २०८२ वैशाख १
formatBS(date, { style: 'short' });                   // 2082-01-01
formatBS(date, { style: 'full' });                    // Monday, 2082 Baisakh 1
formatBS(date, { locale: 'ne', digits: 'latin' });     // 2082 वैशाख 1
formatBSMonth(date, 'ne');                           // वैशाख २०८२
formatDigits(2082, 'devanagari');                     // २०८२
toDevanagari('2082-01-01');                          // २०८२-०१-०१
toLatinDigits('२०८२-०१-०१');                         // 2082-01-01

getWeekdays('en', 1)[0]?.label;                      // Mon (Monday-first)
locales.ne.months[0];                               // वैशाख
```

## 4. Validate dates and handle errors

```ts
import {
  isValidBSDate, createBSDate, assertBSDate, adToBs, BSCalendarError,
} from '@coder-safal/bs-calendar';

isValidBSDate({ year: 2082, month: 1, day: 1 });  // true
isValidBSDate({ year: 2082, month: 13, day: 1 }); // false
isValidBSDate({ year: 2120, month: 1, day: 1 });  // false with bundled data

const date = createBSDate(2082, 1, 1); // A frozen, branded ValidBSDate
assertBSDate(date);                  // Throws if invalid

try {
  adToBs('2025-02-29'); // Gregorian 2025 has no February 29
} catch (error) {
  if (error instanceof BSCalendarError) {
    console.log(error.code);    // INVALID_DATE
    console.log(error.message);
  } else {
    throw error;
  }
}
```

| Error code | Meaning |
| --- | --- |
| `INVALID_DATE` | Invalid fields, nonexistent day, malformed AD input |
| `OUT_OF_RANGE` | Date outside the chosen dataset |
| `INVALID_CONSTRAINT` | Contradictory min/max or an invalid week start |
| `INVALID_CALENDAR_DATA` | Invalid extension rows, duplicate years or gaps |

## 5. Date arithmetic and bounds

```ts
import {
  addBSDays, addBSMonths, compareBS, daysInBSMonth, getBSWeekday, bsDateKey,
  bsToDayOffset, dayOffsetToBS, MIN_BS_DATE, MAX_BS_DATE,
  MIN_AD_DATE, MAX_AD_DATE, SUPPORTED_DAYS,
} from '@coder-safal/bs-calendar';

const date = { year: 2082, month: 1, day: 1 };
addBSDays(date, 7);                  // { year: 2082, month: 1, day: 8 }
addBSMonths(date, 1);                // { year: 2082, month: 2, day: 1 }
addBSDays(date, -1);                 // { year: 2081, month: 12, day: 31 }
daysInBSMonth(2082, 1);              // 31
getBSWeekday(date);                  // 1 (Sunday=0, Monday=1, …, Saturday=6)
compareBS(date, addBSDays(date, 1));  // -1
bsDateKey(date);                     // 2082-01-01
dayOffsetToBS(bsToDayOffset(date));  // Same date

console.log(MIN_BS_DATE, MAX_BS_DATE); // 2000-01-01 … 2090-12-30
console.log(MIN_AD_DATE, MAX_AD_DATE); // 1943-04-14 … 2034-04-13
console.log(SUPPORTED_DAYS);          // 33238
```

Moving by months clamps a day that doesn't exist in the destination month.
Moving outside the chosen dataset throws; dates never wrap to an unrelated year.

## 6. Generate a month grid without React

```ts
import { getBSMonthGrid, isDateDisabled, getBSWeekday } from '@coder-safal/bs-calendar';

const constraints = {
  min: { year: 2082, month: 1, day: 5 },
  max: { year: 2082, month: 1, day: 25 },
  disabledDates: (date: { year: number; month: number; day: number }) => getBSWeekday(date) === 6,
};

const weeks = getBSMonthGrid({ year: 2082, month: 1 }, {
  ...constraints,
  weekStartsOn: 1, // Monday
});

for (const week of weeks) {
  console.log(week.map(day => day ? `${day.date.day}${day.isDisabled ? '×' : ''}` : ''));
}

isDateDisabled({ year: 2082, month: 1, day: 1 }, constraints); // true
```

The grid has six rows of seven dates, including adjacent-month days. Only cells
beyond the dataset endpoints are `null`. `min` and `max` are inclusive.
You can also use `disabledDates: [{ year: 2082, month: 1, day: 10 }]`.

## 7. Complete controlled React calendar

Place this in `Calendar.tsx`. It demonstrates a controlled selection, English /
Nepali switching, limits, disabled Saturdays, today's marker, and form output.

```tsx
'use client';

import { useState } from 'react';
import { bsDateKey, formatBS, getBSWeekday, type BSDate, type Locale } from '@coder-safal/bs-calendar';
import { useBSCalendar } from '@coder-safal/bs-calendar/react';
import './calendar.css';

export function Calendar({ today }: { today?: BSDate }) {
  const [value, setValue] = useState<BSDate | null>(null);
  const [locale, setLocale] = useState<Locale>('en');
  const calendar = useBSCalendar({
    value,
    onChange: setValue,
    locale,
    initialMonth: { year: 2082, month: 1 },
    min: { year: 2082, month: 1, day: 1 },
    max: { year: 2082, month: 12, day: 30 },
    disabledDates: date => getBSWeekday(date) === 6,
    weekStartsOn: 0,
    ...(today ? { today } : {}),
  });

  return (
    <section className="bs-calendar">
      <label>
        Language
        <select value={locale} onChange={event => setLocale(event.target.value as Locale)}>
          <option value="en">English</option>
          <option value="ne">नेपाली</option>
        </select>
      </label>
      <nav aria-label="Calendar navigation">
        <button {...calendar.getPreviousMonthProps()}>←</button>
        <h2 aria-live="polite">{calendar.monthLabel}</h2>
        <button {...calendar.getNextMonthProps()}>→</button>
      </nav>

      <div {...calendar.getGridProps()}>
        <div role="row" className="bs-week">
          {calendar.weekdays.map(day => (
            <span role="columnheader" aria-label={day.fullLabel} key={day.weekday}>
              {day.label}
            </span>
          ))}
        </div>
        {calendar.weeks.map((week, row) => (
          <div role="row" className="bs-week" key={row}>
            {week.map((day, column) => day ? (
              <button {...calendar.getDayProps(day)} key={day.key}>
                {day.label}
              </button>
            ) : (
              <span role="gridcell" aria-disabled="true" key={column} />
            ))}
          </div>
        ))}
      </div>

      <p aria-live="polite">{value ? formatBS(value, { locale }) : 'Choose a date'}</p>
      <input type="hidden" name="date" value={value ? bsDateKey(value) : ''} />
      <button type="button" onClick={() => setValue(null)}>Clear selection</button>
    </section>
  );
}
```

Create `calendar.css` next to the component:

```css
.bs-calendar { max-width: 380px; padding: 20px; font-family: system-ui; }
.bs-calendar nav { display: flex; justify-content: space-between; align-items: center; }
.bs-calendar h2 { font-size: 20px; }
.bs-week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.bs-week [role="columnheader"] { text-align: center; padding: 10px 0; }
.bs-week button { min-height: 42px; border: 0; border-radius: 5px; cursor: pointer; background: #f0f2eb; color: #263e31; }
.bs-week [data-outside-month="true"] { background: white; color: #586458; }
.bs-week [data-selected="true"] { background: #31503d; color: white; }
.bs-week [data-today="true"] { text-decoration: underline; }
.bs-week [aria-disabled="true"] { color: #626262; background: #e8e8e8; cursor: not-allowed; text-decoration: line-through; }
.bs-calendar button:focus-visible, .bs-calendar select:focus-visible { outline: 3px solid #a36514; outline-offset: 2px; }
```

Render `<Calendar />` in Vite, or pass a stable `today` from a Next.js server
component. Keep the getter's `ref`, events, roles, and ARIA props when styling.
If you later change constraints, clear a now-invalid controlled value yourself.

Keyboard practice: arrows move a day/week; Home/End move within a week;
Page Up/Down change months; Shift + Page Up/Down change years; Enter/Space
select. Disabled dates remain focusable for discovery but cannot be selected.

## 8. Uncontrolled state and navigation

Use these options inside the same component above if the parent doesn't need
to own the selected value. Render `calendar.selected` instead of a `value` state.

```tsx
const calendar = useBSCalendar({
  defaultValue: { year: 2082, month: 1, day: 1 },
  locale: 'ne',
  digits: 'latin', // Nepali names with Latin digits
  onChange: date => console.log('Selected:', date),
});
```

Optional toolbar actions, used inside the JSX of a component with `calendar`:

```tsx
<button type="button" onClick={() => calendar.goToMonth({ year: 2082, month: 4 })}>
  Go to Shrawan 2082
</button>
<button type="button" onClick={() => calendar.selectDate({ year: 2082, month: 4, day: 10 })}>
  Select Shrawan 10
</button>
```

`goToMonth`, `goToPrevMonth`, `goToNextMonth`, and `selectDate` return a boolean
indicating whether the request was accepted. Programmatic selection respects
the same limits and disabled dates as pointer and keyboard selection.

## 9. Extend the dataset

Use your own independently verified data. This function validates structure;
it cannot certify official month lengths. It returns a separate immutable
dataset, leaving default calendars unchanged.

```ts
import { extendCalendarData, bsToAd, adToBs, formatBS } from '@coder-safal/bs-calendar';
import verifiedYears from './verified-bs-years.json';

// Each row: { year: 2091, months: [12 verified numbers, Baisakh → Chaitra] }
export const calendarData = extendCalendarData(verifiedYears);
const date = { year: 2091, month: 1, day: 1 };
const ad = bsToAd(date, calendarData);
adToBs(ad, calendarData);
formatBS(date, { locale: 'ne', calendarData });

console.log(calendarData.minBSDate, calendarData.maxBSDate);
console.log(calendarData.minADDate, calendarData.maxADDate);
```

For practice without sourcing a real new year, this **synthetic fixture** is
executable. These numbers do **not** assert what the official year 2091 contains:

```ts
import { extendCalendarData, bsToAd, adToBs } from '@coder-safal/bs-calendar';

const practiceData = extendCalendarData([{
  year: 2091,
  months: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
}]);
const practiceDate = { year: 2091, month: 1, day: 1 };
console.log(adToBs(bsToAd(practiceDate, practiceData), practiceData));
// { year: 2091, month: 1, day: 1 } — tests mechanics only
```

Supply every intervening year: supporting 2120 requires 2091–2120, not a single
2120 row. Prepending earlier consecutive years is also supported. Each row must
have 12 integers from 29–32, totaling 365 or 366. Gaps, duplicates, and attempts
to overwrite existing years throw `INVALID_CALENDAR_DATA`.

Chain additions with `extendCalendarData(moreVerifiedYears, calendarData)`.
Pass the result to every operation that uses extended dates:

```tsx
// Inside a React client component; calendarData is created once or passed as a prop.
const calendar = useBSCalendar({
  calendarData,
  initialMonth: { year: 2091, month: 1 },
});
```

| API | Custom data argument |
| --- | --- |
| `adToBs`, `bsToAd`, `getBSWeekday`, `isValidBSDate`, `assertBSDate`, `assertBSMonth`, `bsDateKey`, `bsToDayOffset`, `dayOffsetToBS` | Second argument |
| `addBSDays`, `addBSMonths`, `compareBS`, `daysInBSMonth` | Third argument |
| `createBSDate` | Fourth argument |
| `formatBSMonth(month, locale, digits, calendarData)` | Fourth argument |
| `formatBS`, `getBSMonthGrid`, `isDateDisabled`, `useBSCalendar` | `calendarData` field in options |

Exported `MIN_*`, `MAX_*`, `SUPPORTED_DAYS`, and `BS_MONTH_DAYS` always refer to
the bundled data. Read extended bounds from your returned `calendarData` object.

## 10. Next.js App Router

Import pure utilities from the root in server components and the hook from
`/react` in client components. Example `app/page.tsx` using the full calendar
from section 7, placed in `app/Calendar.tsx`:

```tsx
import { adToBs, formatBS } from '@coder-safal/bs-calendar';
import { Calendar } from './Calendar';

export default function Page() {
  // A fixed date keeps this practice example reproducible across SSR and hydration.
  const today = adToBs('2025-04-14');
  return (
    <main>
      <h1>{formatBS(today, { locale: 'ne' })}</h1>
      <Calendar today={today} />
    </main>
  );
}
```

The hook does not read the clock. To use real today, compute its Kathmandu civil
date on the server with section 2, and pass the resulting object to the client.
Custom `CalendarData` is serializable and can also be passed as a prop; server
and client must use the same data.

Working files already included in the repository:

- [Vite interactive demo](examples/vite/main.tsx)
- [Next.js server page](examples/next/app/page.tsx)
- [Next.js client calendar](examples/next/app/picker.tsx)

## 11. CommonJS and types

In a `.cjs` file after installing or building the package:

```js
const { adToBs, bsToAd } = require('@coder-safal/bs-calendar/core');
const date = adToBs('2025-04-14');
console.log(bsToAd(date).toISOString()); // 2025-04-14T00:00:00.000Z
```

TypeScript uses named type imports without any extra `@types` package:

```ts
import {
  createBSDate, type BSDate, type ValidBSDate, type BSMonth,
  type Locale, type Digits, type Weekday, type CalendarYearData, type CalendarData,
} from '@coder-safal/bs-calendar';

const date: BSDate = { year: 2082, month: 1, day: 1 };
const validated: ValidBSDate = createBSDate(date.year, date.month, date.day);
const month: BSMonth = { year: 2082, month: 1 };
const locale: Locale = 'ne';
const digits: Digits = 'devanagari';
const weekStartsOn: Weekday = 1;
```

## 12. Practice tasks and checks

1. Run the Vite demo, choose a date, then switch between English and Nepali.
2. Use arrow keys and Page Up/Down; check that Enter selects and focus stays visible.
3. Toggle date restrictions and confirm Saturdays cannot be selected.
4. Convert `2025-04-14` and confirm BS `2082-01-01`.
5. Try `2025-02-29`; catch `INVALID_DATE`.
6. Try BS `2120-01-01` with default data; catch `OUT_OF_RANGE`.
7. Run the synthetic extension exercise; then try skipping 2091 and confirm rejection.
8. Run `pnpm check` or `npm run check`, then the Next.js production build.

The package provides the headless single-date hook. A styled popover component,
date ranges, dual AD day labels, holidays, and form-library adapters are outside
v0.1 and are not required for these examples.
