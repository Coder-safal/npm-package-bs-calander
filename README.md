# @coder-safal/bs-calendar

Headless Bikram Sambat dates for React and Next.js. **v0.1.0** provides pure
BS ⇄ AD conversion, English and Nepali locales, Devanagari digits, and an
accessible single-date calendar hook. Bring your own markup and styles.

```sh
npm install @coder-safal/bs-calendar
# Or use pnpm:
pnpm add @coder-safal/bs-calendar
```

**[EXAMPLE.md — all examples and practice instructions](EXAMPLE.md)** covers
conversion, formatting, validation, arithmetic, custom data, controlled React
calendars, styling, Next.js, and CommonJS.

Working package name; this repository does not imply that a release has been
published. The public npm registry returned no package under this name when
checked on 2026-10-28. React and React DOM 18.2+ or 19 are peer dependencies.

## Core utilities

The root and `/core` entry points are pure and usable in server components;
they do not import React or declare a client boundary.

```ts
import { adToBs, bsToAd, formatBS, createBSDate } from '@coder-safal/bs-calendar';

const date = adToBs('2025-04-14');
// { year: 2082, month: 1, day: 1 }

bsToAd(date).toISOString();
// '2025-04-14T00:00:00.000Z'

formatBS(date); // '2082 Baisakh 1'
formatBS(date, { locale: 'ne' }); // '२०८२ वैशाख १'
formatBS(date, { style: 'short' }); // '2082-01-01'
formatBS(date, { style: 'full' }); // 'Monday, 2082 Baisakh 1'
formatBS(date, { locale: 'ne', digits: 'latin' }); // '2082 वैशाख 1'

const validated = createBSDate(2082, 1, 1); // frozen, branded ValidBSDate
```

All months are **1-based**. The structural `BSDate` type is ergonomic for forms;
`createBSDate` / `assertBSDate` produce a branded `ValidBSDate`. Conversion and
formatting functions validate structural input at runtime.

**AD date semantics:** prefer date-only strings. `Date` inputs use UTC fields,
and `bsToAd` returns UTC midnight. For display with `Intl.DateTimeFormat`, use
`timeZone: 'UTC'` to retain that calendar day.

Supported BS years: **2000–2090 inclusive** (AD **1943-04-14–2034-04-13**), from an attributed MIT dataset.
The whole table has not been independently certified. Future calendar data may
change. See [data provenance, independent samples and limitations](docs/calendar-data.md).

Other exports: `addBSDays`, `addBSMonths` (clamps shorter months), `compareBS`,
`daysInBSMonth`, `getBSWeekday` (Sunday = 0), `getBSMonthGrid`, `getWeekdays`,
`formatBSMonth`, `formatDigits`, `toDevanagari`, `toLatinDigits`, `isValidBSDate`,
`isDateDisabled`, `bsDateKey`, `MIN_BS_DATE`, `MAX_BS_DATE`, `MIN_AD_DATE`,
`MAX_AD_DATE`, `BS_MONTH_DAYS`, and `locales`.

Invalid dates throw `BSCalendarError extends RangeError`. Its `code` is
`INVALID_DATE`, `OUT_OF_RANGE`, `INVALID_CONSTRAINT` (for contradictory limits),
or `INVALID_CALENDAR_DATA` (for malformed extensions).

## Extend the calendar data

Add years yourself when you have verified month lengths. No package release is
needed. `extendCalendarData` returns a new immutable dataset; bundled data and
other calendars remain unchanged. Create it once during application setup.

```ts
import { extendCalendarData, bsToAd, adToBs, formatBS } from '@coder-safal/bs-calendar';
import verifiedYears from './verified-bs-years.json';

// JSON shape: [{ "year": 2091, "months": [12 verified month lengths] }]
// months must be ordered Baisakh → Chaitra. Supply your own verified values.
export const calendarData = extendCalendarData(verifiedYears);

const date = { year: 2091, month: 1, day: 1 };
const ad = bsToAd(date, calendarData);
adToBs(ad, calendarData);
formatBS(date, { locale: 'ne', calendarData });

console.log(calendarData.minBSDate, calendarData.maxBSDate);
console.log(calendarData.minADDate, calendarData.maxADDate);
```

In a React client component, use that same dataset:

```tsx
const calendar = useBSCalendar({ calendarData, initialMonth: { year: 2091, month: 1 } });
```

Extensions can prepend years, append years, or do both. Input order does not
matter. Each year requires exactly 12 integer month lengths from 29–32, totaling
365 or 366 days. Duplicate or existing years and gaps are rejected with
`INVALID_CALENDAR_DATA`; failures never partially update data. Supplied arrays
are copied and frozen so later changes cannot alter conversions.

To support **2120**, supply **every year from 2091 through 2120**; a single 2120
row cannot establish its offset from the reference date. To extend an already
extended dataset, pass it as the second argument:

```ts
const moreData = extendCalendarData(moreVerifiedYears, calendarData);
```

Adding earlier years preserves all existing BS ⇄ AD mappings. Existing years
cannot be overwritten by this API. Structural validation does not certify that
the supplied month lengths match official calendars; keep their sources and
independent date fixtures in your application.

All date validators, arithmetic and conversion utilities accept `calendarData`
as their final optional argument. `formatBS`, `getBSMonthGrid`,
`isDateDisabled`, and the hook take it inside their options instead;
`formatBSMonth(month, locale, digits, calendarData)` takes it last. Calls that
omit a dataset and the exported `MIN_*`, `MAX_*`, `SUPPORTED_DAYS`, and
`BS_MONTH_DAYS` constants continue to describe the bundled **2000–2090** range.
Read custom bounds and `supportedDays` from the returned dataset.

For Next.js, use the same data on the server and client. `CalendarData` contains
only serializable values and may be passed from a server component to a client
component. Keep the dataset stable for a mounted calendar; remount it if you
switch to an unrelated dataset with a narrower range.

## React hook

Use the `/react` entry point, which includes the `"use client"` directive.

```tsx
'use client';

import { useBSCalendar } from '@coder-safal/bs-calendar/react';

export function Calendar() {
  const calendar = useBSCalendar({
    defaultValue: { year: 2082, month: 1, day: 1 },
    locale: 'ne',
    onChange: date => console.log(date),
  });

  return (
    <section>
      <div>
        <button {...calendar.getPreviousMonthProps()}>←</button>
        <h2 aria-live="polite">{calendar.monthLabel}</h2>
        <button {...calendar.getNextMonthProps()}>→</button>
      </div>
      <div {...calendar.getGridProps()}>
        <div role="row">
          {calendar.weekdays.map(day => (
            <span role="columnheader" aria-label={day.fullLabel} key={day.weekday}>
              {day.label}
            </span>
          ))}
        </div>
        {calendar.weeks.map((week, row) => (
          <div role="row" key={row}>
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
    </section>
  );
}
```

Style each row as a seven-column grid. Keep a visible `:focus-visible` outline.
Day buttons expose `data-selected`, `data-today`, and `data-outside-month`.
Use `[aria-disabled="true"]` for disabled styles. Prop getters include refs
and handlers needed for focus management; preserve them when adding handlers.

| Option | Behavior |
| --- | --- |
| `value` | Controlled selection; `null` means empty, `undefined` means uncontrolled |
| `defaultValue` | Initial uncontrolled selection |
| `onChange(date)` | Called on allowed selection, with a frozen date |
| `initialMonth` | Initial visible `{ year, month }`; overrides the selected/today month |
| `today` | Explicit date to mark; no implicit clock reads |
| `locale` | `en` (default) or `ne`; Nepali defaults to Devanagari digits |
| `digits` | Override with `latin` or `devanagari` |
| `weekStartsOn` | `0`–`6`, Sunday (default) through Saturday |
| `min`, `max` | Inclusive selectable date limits, also bounding month navigation |
| `disabledDates` | An array of dates or `(date) => boolean` |
| `calendarData` | An immutable dataset from `extendCalendarData`; defaults to bundled data |

Return values include `weeks`, `weekdays`, `visibleMonth`, `monthLabel`,
`selected`, `focusedDate`, `goToMonth`, `goToPrevMonth`, `goToNextMonth`,
`canGoToPrevMonth`, `canGoToNextMonth`, `selectDate`, and the prop getters.
Navigation and `selectDate` return whether the request was accepted.

There are six rows of seven days, including adjacent-month dates. Only cells
beyond the dataset endpoints are `null`. Each day includes `date`, `key`,
`label`, `isSelected`, `isToday`, `isDisabled`, and `isOutsideMonth`.

Selection is separate from focus: moving with the keyboard doesn't select.
Disabled dates reject pointer, keyboard, and programmatic selection. An existing
selected value stays visible if constraints later disable it; the caller owns
clearing invalid form values.

## Keyboard and accessibility

| Key | Action |
| --- | --- |
| Left / Right | Previous / next day |
| Up / Down | Previous / next week |
| Home / End | First / last day of the configured week |
| Page Up / Down | Previous / next month, clamping shorter months |
| Shift + Page Up / Down | Previous / next year |
| Enter / Space | Select the focused date using native button activation |

The grid uses one roving tab stop. Disabled dates remain focusable so assistive
technology can announce them, while selection is blocked. Min/max clamp keyboard
movement. Month changes move actual DOM focus when initiated by day keyboard
navigation; toolbar buttons retain their focus. Mount and hydration do not steal focus.
The hook provides grid/cell semantics, localized labels, `aria-selected`,
`aria-disabled`, and `aria-current="date"`. The caller supplies row/columnheader
markup and a polite month announcement, as in the examples. The headless hook
has no animation; both examples respect reduced motion or use no motion.

## Next.js

Import conversions from the root in server components. Import the hook from
`/react` within a client component. Pass a serializable `BSDate` from the server
for `today` or `initialMonth` so server and client agree. With no input, the
calendar starts at `min` or BS 2000-01-01 deterministically.

See [the App Router example](examples/next/app/page.tsx) and
[its client calendar](examples/next/app/picker.tsx).

## Local development

Requires Node 22.12+ for the demo/build tools; distributed output targets Node 20+.

```sh
npm install
npm run dev          # Interactive Vite demo
npm run check        # Strict types, unit/interaction/SSR tests, library + demo builds
npm run build:next   # Actual Next.js App Router production build
npm run dev:next     # Next.js example
npm pack --dry-run   # Review the release contents
```

The same commands work with pnpm (tested with pnpm 10):

```sh
pnpm install
pnpm dev
pnpm check
pnpm build:next
pnpm dev:next
pnpm pack
```

Both `package-lock.json` and `pnpm-lock.yaml` are supplied. Use one package
manager per checkout. In CI, use `npm ci` or `pnpm install --frozen-lockfile`.

ESM, CJS, and TypeScript declarations are emitted with tsup. The published
package has no runtime dependencies; React/React DOM are external peers.
Tests round-trip every supported day, cross-check independent published samples,
exercise real DOM focus/selection, and hydrate server-rendered markup.

## Scope

This first release stops at core utilities and the headless single-date hook.
Styled popover/input components, date ranges, dual AD day labels, form-library
adapters, holidays, dropdown navigation, and time selection belong to later
versions. Publishing is a separate release step.

MIT. Calendar table attribution: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
