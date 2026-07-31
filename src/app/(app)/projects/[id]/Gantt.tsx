import type { ProjectActivityWithSchedule } from "@/lib/schedule";

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

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-[900px]">
        <div className="relative mb-2 flex border-b border-slate-200 pb-1 text-[11px] text-slate-400">
          {months.map((m) => (
            <div
              key={m.toISOString()}
              className="absolute -translate-x-1/2"
              style={{ left: `${pct(m)}%` }}
            >
              {new Intl.DateTimeFormat("pt-PT", { month: "short", year: "2-digit" }).format(m)}
            </div>
          ))}
          <div className="invisible">.</div>
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
                <div className="w-40 shrink-0 truncate text-slate-600" title={`${a.code} — ${a.activity}`}>
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
