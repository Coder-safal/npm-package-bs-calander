/** Months are 1–12. Dates contain no time or timezone. */
export interface BSDate { readonly year: number; readonly month: number; readonly day: number }
export interface BSMonth { readonly year: number; readonly month: number }
declare const validBSDate: unique symbol;
export type ValidBSDate = BSDate & { readonly [validBSDate]: true };
export type Locale = 'en' | 'ne';
export type Digits = 'latin' | 'devanagari';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type CalendarErrorCode = 'INVALID_DATE' | 'OUT_OF_RANGE' | 'INVALID_CONSTRAINT' | 'INVALID_CALENDAR_DATA';

export class BSCalendarError extends RangeError {
  readonly code: CalendarErrorCode;
  constructor(code: CalendarErrorCode, message: string) {
    super(message);
    this.name = 'BSCalendarError';
    this.code = code;
  }
}
