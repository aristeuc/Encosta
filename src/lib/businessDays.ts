const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDateOnlyUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function dateKey(date: Date): string {
  return toDateOnlyUTC(date).toISOString().slice(0, 10);
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function isBusinessDay(date: Date, holidaySet: ReadonlySet<string>): boolean {
  if (isWeekend(date)) return false;
  return !holidaySet.has(dateKey(date));
}

/**
 * Moves `n` business days from `date`, skipping weekends and holidays.
 * n > 0 moves forward, n < 0 moves backward, n === 0 returns the same day.
 * `date` itself is never counted as one of the moved days.
 */
export function addBusinessDays(date: Date, n: number, holidaySet: ReadonlySet<string>): Date {
  let result = toDateOnlyUTC(date);
  const step = n >= 0 ? 1 : -1;
  let remaining = Math.abs(n);
  while (remaining > 0) {
    result = new Date(result.getTime() + step * MS_PER_DAY);
    if (isBusinessDay(result, holidaySet)) remaining--;
  }
  return result;
}

export function nextBusinessDay(date: Date, holidaySet: ReadonlySet<string>): Date {
  return addBusinessDays(date, 1, holidaySet);
}

/** Number of business days that separate `from` and `to` (assumes to >= from). */
export function businessDaysBetween(from: Date, to: Date, holidaySet: ReadonlySet<string>): number {
  const a = toDateOnlyUTC(from);
  const b = toDateOnlyUTC(to);
  if (b <= a) return 0;
  let count = 0;
  let cur = a;
  while (cur < b) {
    cur = new Date(cur.getTime() + MS_PER_DAY);
    if (isBusinessDay(cur, holidaySet)) count++;
  }
  return count;
}

export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((toDateOnlyUTC(to).getTime() - toDateOnlyUTC(from).getTime()) / MS_PER_DAY);
}
