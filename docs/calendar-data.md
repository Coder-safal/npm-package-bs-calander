# Calendar data and conversion policy

## Supported range

v0.1 uses the 91-year BS **2000–2090** table from
[subeshb1/Nepali-Date](https://github.com/subeshb1/Nepali-Date/blob/2183c30ada24a7fe678a24d58a5aa61ce8cdfa85/src/date-config.ts),
pinned to commit `2183c30ada24a7fe678a24d58a5aa61ce8cdfa85`.
The MIT license and source checksum are in `THIRD_PARTY_NOTICES.md`.
The arrays preserve every published month length; they are not extrapolated by formula.
Future years in this table are predictions and may need corrections when official
calendars are published. This is a third-party dataset, not an officially certified calendar.

`MIN_BS_DATE`, `MAX_BS_DATE`, `MIN_AD_DATE`, and `MAX_AD_DATE` expose the bundled
inclusive endpoints. Dates outside the selected dataset throw `BSCalendarError`
with code `OUT_OF_RANGE`.

## User-supplied extensions

`extendCalendarData(years, base?)` adds consecutive complete years before or after
the bundled table (or an earlier extension). It returns an immutable
`CalendarData`; it never mutates module state. Converters accept this dataset as
their final optional argument. The hook, grid, constraints and `formatBS` accept
it as `calendarData` in their options. See the README for usage.

Each row is `{ year, months }` with exactly twelve integer lengths from 29–32,
ordered Baisakh to Chaitra, totaling 365 or 366 days. Years must be integers from
1–9999 and their derived AD dates must fit four-digit AD years. Gaps, duplicates,
and replacements are rejected atomically with `INVALID_CALENDAR_DATA`.
Supporting 2120 requires all rows from 2091 through 2120, not just 2120.

Prepending years moves the dataset's starting AD date backward by the supplied
day counts, preserving the existing 2000-01-01 BS reference. Appending years
continues from the previous last day. Dataset-specific bounds live on the
returned object's `minBSDate`, `maxBSDate`, `minADDate`, and `maxADDate` fields;
exported bound constants continue to describe the bundled table.

The extension function checks structure and continuity, not historical accuracy.
Users must source and independently verify their own additions. Extension tests
use explicitly synthetic rows to test mechanics; these rows are not shipped as
verified calendar years.

## Independent references

The epoch **2000-01-01 BS = 1943-04-14 AD** is documented in the
[DHS Program's Guide to DHS Statistics, calendar systems section](https://dhsprogram.com/pubs/pdf/DHSG1/Guide_to_DHS_Statistics_DHS-8.pdf).

Recent independent samples come from the
[Embassy of Nepal, Abu Dhabi's published 2082 holidays](https://ae.nepalembassy.gov.np/pages/holidays-16/):

| BS date | AD date | Reference |
| --- | --- | --- |
| 2082-01-01 | 2025-04-14 | New Year |
| 2082-01-18 | 2025-05-01 | Labour Day |
| 2082-02-15 | 2025-05-29 | Republic Day |
| 2082-06-03 | 2025-09-19 | Constitution Day |
| 2082-06-16 | 2025-10-02 | Dashain |
| 2082-07-10 | 2025-10-27 | Chhath |
| 2082-10-16 | 2026-01-30 | Martyrs' Day |
| 2082-11-07 | 2026-02-19 | Democracy Day |

The source's Buddha Jayanti row and UAE National Day row have inconsistent
BS/AD text; they are excluded from the test fixtures. Public holiday events are
not shipped in this package. New Year 2082 is also independently documented by
[Nepal's National Assembly](https://hr.parliament.gov.np/index.php/en/news/1746254194).

## What verification establishes

Tests cover every supported date in both conversion directions, consecutive-day
continuity, dataset boundaries, invalid inputs, and the independent samples above.
Round trips prove the implementation is internally consistent; they do not certify
every month in the upstream table. Extending the table or correcting it should
include an independent published reference and regression fixtures.

## Date and timezone contract

BS dates are date-only objects with **1-based** months. AD input accepts exact
`YYYY-MM-DD` strings or `Date` instances interpreted using **UTC** year/month/day.
Output is a new `Date` at UTC midnight. Times are discarded. No local timezone,
daylight saving, or historical Kathmandu UTC offset affects the arithmetic.

For a Kathmandu civil date, produce the date-only string in `Asia/Kathmandu`
before calling `adToBs`. Avoid `new Date(year, month, day)` with local fields if
you intend to pass that same local calendar day; use a date-only string instead.

The hook never reads the clock. Pass `today` and/or `initialMonth` explicitly,
with identical values on server and client. Its deterministic default is the
first supported date (or `min`, if supplied).
