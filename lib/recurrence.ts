// Pure helpers for periodic-transaction cadences. No DB / server deps so they
// can be used on client and server.

export type Anchor =
  | "DAY_OF_MONTH"
  | "SECOND_TO_LAST_DAY"
  | "LAST_DAY"
  | "WEEKLY";

// Occurrences fire at this local hour.
const FIRE_HOUR = 9;

const daysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

function monthlyCandidate(
  year: number,
  month: number,
  anchor: Anchor,
  dayValue: number | null | undefined,
): Date {
  const last = daysInMonth(year, month);
  let day: number;
  if (anchor === "LAST_DAY") day = last;
  else if (anchor === "SECOND_TO_LAST_DAY") day = Math.max(1, last - 1);
  else day = Math.min(Math.max(1, dayValue ?? 1), last); // DAY_OF_MONTH
  return new Date(year, month, day, FIRE_HOUR, 0, 0, 0);
}

/** Earliest occurrence strictly after `after`. */
export function nextRun(
  anchor: Anchor,
  dayValue: number | null | undefined,
  after: Date = new Date(),
): Date {
  if (anchor === "WEEKLY") {
    const target = ((dayValue ?? 1) % 7 + 7) % 7; // 0=Sun..6=Sat
    const d = new Date(after);
    d.setHours(FIRE_HOUR, 0, 0, 0);
    let guard = 0;
    while (d <= after || d.getDay() !== target) {
      d.setDate(d.getDate() + 1);
      d.setHours(FIRE_HOUR, 0, 0, 0);
      if (++guard > 14) break;
    }
    return d;
  }

  // Monthly anchors: try this month, else roll forward.
  let year = after.getFullYear();
  let month = after.getMonth();
  let candidate = monthlyCandidate(year, month, anchor, dayValue);
  if (candidate <= after) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    candidate = monthlyCandidate(year, month, anchor, dayValue);
  }
  return candidate;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};

/** Human-readable cadence, e.g. "2nd-to-last day", "1st of month", "every Mon". */
export function cadenceLabel(
  anchor: Anchor,
  dayValue: number | null | undefined,
): string {
  switch (anchor) {
    case "LAST_DAY":
      return "last day of month";
    case "SECOND_TO_LAST_DAY":
      return "2nd-to-last day";
    case "WEEKLY":
      return `every ${WEEKDAYS[((dayValue ?? 1) % 7 + 7) % 7]}`;
    default:
      return `${ordinal(dayValue ?? 1)} of month`;
  }
}
