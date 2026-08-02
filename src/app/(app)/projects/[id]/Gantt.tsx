import type { ProjectActivityWithSchedule } from "@/lib/schedule";

const MONTH_ABBREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const LABEL_WIDTH = 224;

function formatMonthLabel(date: Date): string {
  // Avoid Intl.DateTimeFormat's locale month names here: on some server
  // runtimes without full ICU data, "pt-PT"/{month:"short"} silently falls
  // back to a plain numeric month, which reads like an ambiguous MM/YY date.
  const month = MONTH_ABBREV[date.getUTCMonth()];
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${month}/${year}`;
}

function monthsBetween(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  let cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cur <= last) {
    months.push(cur);
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
  }
  return months;
}

export function Gantt({
  activities,
  rangeStart,
  rangeEnd,
}: {
  activities: ProjectActivityWithSchedule[];
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const totalDays = Math.max(1, (rangeEnd.getTime() - rangeStart.getTime()) / 86400000);
  const months = monthsBetween(rangeStart, rangeEnd);

  const pct = (date: Date) => Math.min(100, Math.max(0, ((date.getTime() - rangeStart.getTime()) / 86400000 / totalDays) * 100));
  // Each month label needs real breathing room, or adjacent ones overlap —
  // a fixed-width timeline packs dozens of months into the same 900px
  // regardless of how many there are. This is the width of the bars area
  // alone; the activity-name column below is added on top of it.
  const barsWidth = Math.max(900 - LABEL_WIDTH, months.length * 56);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div style={{ minWidth: LABEL_WIDTH + barsWidth }}>
        {/* The month header's spacer must match the activity-label column
            width exactly, otherwise the month ticks (positioned relative to
            the bars area only) drift out of alignment with the bars
            themselves as the label column's width changes. */}
        <div className="mb-2 flex border-b border-slate-200 pb-1 text-[11px] text-slate-400">
          <div style={{ width: LABEL_WIDTH }} className="shrink-0" />
          <div className="relative flex-1">
            {months.map((m) => (
              <div key={m.toISOString()} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pct(m)}%` }}>
                {formatMonthLabel(m)}
              </div>
            ))}
            <div className="invisible">.</div>
          </div>
        </div>
        <div className="space-y-1.5 pt-4">
          {activities.map((a) => {
            const plannedLeft = pct(a.schedule.plannedStart);
            const plannedWidth = Math.max(0.6, pct(a.schedule.plannedEnd) - plannedLeft);
            const hasReal = a.actualStart || a.actualEnd;
            const realStart = a.actualStart ?? a.schedule.plannedStart;
            const realEnd = a.actualEnd ?? (a.actualStart ? new Date() : null);
            const realLeft = realEnd ? pct(realStart) : null;
            const realWidth = realEnd ? Math.max(0.6, pct(realEnd) - pct(realStart)) : 0;

            return (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <div
                  style={{ width: LABEL_WIDTH }}
                  className="sticky left-0 z-10 shrink-0 whitespace-normal break-words bg-white pr-2 leading-tight text-slate-600"
                  title={`${a.code} — ${a.activity}`}
                >
                  <span className="font-mono text-[10px] text-slate-400">{a.code}</span> {a.activity}
                </div>
                <div className="relative h-4 flex-1 rounded bg-slate-50">
                  <div
                    className={`absolute top-0 h-4 rounded ${a.schedule.isCritical ? "bg-red-300" : "bg-sky-300"}`}
                    style={{ left: `${plannedLeft}%`, width: `${plannedWidth}%` }}
                  />
                  {hasReal && realLeft !== null && (
                    <div
                      className="absolute top-0.5 h-3 rounded bg-slate-800/80"
                      style={{ left: `${realLeft}%`, width: `${realWidth}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded bg-sky-300" /> Previsto
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded bg-red-300" /> Crítico
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded bg-slate-800/80" /> Real
          </span>
        </div>
      </div>
    </div>
  );
}
