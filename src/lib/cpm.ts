import { addBusinessDays, businessDaysBetween, calendarDaysBetween, dateKey, toDateOnlyUTC } from "./businessDays";

export type ActivityStatus = "NAO_INICIADO" | "EM_CURSO" | "CONCLUIDO" | "EM_ATRASO_INICIO";

export interface CpmActivityInput {
  code: string;
  durationDays: number;
  predecessorCodes: string[];
  lagDays: number;
  actualStart?: Date | null;
  actualEnd?: Date | null;
}

export interface CpmActivityResult {
  code: string;
  plannedStart: Date;
  plannedEnd: Date;
  lateStart: Date;
  lateFinish: Date;
  totalFloatDays: number;
  freeFloatDays: number;
  isCritical: boolean;
  status: ActivityStatus;
  /** Fim Real - Fim Previsto, em dias de calendário. Positivo = atrasado. Só definido se actualEnd existir. */
  deviationDays: number | null;
}

export interface CpmError {
  code: string;
  message: string;
}

export interface CpmResult {
  projectEnd: Date | null;
  activities: Record<string, CpmActivityResult>;
  errors: CpmError[];
}

/**
 * Replicates the CRONOGRAMA sheet's calculation: forward pass for planned
 * dates (business days, holidays-aware) and backward pass for late dates /
 * float / critical path, exactly as documented in the MANUAL sheet.
 */
export function computeSchedule(
  activities: CpmActivityInput[],
  projectStartDate: Date,
  holidays: Date[],
  today: Date = new Date(),
): CpmResult {
  const holidaySet = new Set(holidays.map(dateKey));
  const byCode = new Map(activities.map((a) => [a.code, a]));
  const errors: CpmError[] = [];

  const validPredecessors = (a: CpmActivityInput): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of a.predecessorCodes) {
      if (!p) continue;
      if (p === a.code) {
        errors.push({ code: a.code, message: `A atividade ${a.code} não pode ser precedente de si própria.` });
        continue;
      }
      if (!byCode.has(p)) {
        errors.push({ code: a.code, message: `Precedente "${p}" não existe.` });
        continue;
      }
      if (!seen.has(p)) {
        seen.add(p);
        result.push(p);
      }
    }
    return result;
  };

  const predecessorsByCode = new Map(activities.map((a) => [a.code, validPredecessors(a)]));

  const successors = new Map<string, string[]>();
  for (const a of activities) successors.set(a.code, []);
  for (const a of activities) {
    for (const p of predecessorsByCode.get(a.code)!) {
      successors.get(p)!.push(a.code);
    }
  }

  // Topological sort (Kahn's algorithm)
  const indegree = new Map<string, number>();
  for (const a of activities) indegree.set(a.code, predecessorsByCode.get(a.code)!.length);
  const queue: string[] = activities.filter((a) => indegree.get(a.code) === 0).map((a) => a.code);
  const order: string[] = [];
  while (queue.length) {
    const code = queue.shift()!;
    order.push(code);
    for (const s of successors.get(code) ?? []) {
      indegree.set(s, indegree.get(s)! - 1);
      if (indegree.get(s) === 0) queue.push(s);
    }
  }
  const orderSet = new Set(order);
  let cycleCodes: string[] = [];
  if (order.length < activities.length) {
    cycleCodes = activities.map((a) => a.code).filter((c) => !orderSet.has(c));
    errors.push({ code: cycleCodes.join(", "), message: "Ciclo de dependências detetado — verifique os precedentes." });
    // Deliberately NOT added to `order`: CPM math is undefined for a cyclic
    // graph, and appending them in arbitrary order previously crashed the
    // forward/backward passes (they'd read another unprocessed cycle
    // member's date as if it were already computed). They get a safe
    // placeholder result below instead.
  }

  /** A node's successors, restricted to ones that were actually scheduled
   *  (excludes any successor caught in a dependency cycle). */
  const scheduledSuccessors = (code: string) => (successors.get(code) ?? []).filter((s) => orderSet.has(s));

  const projectStart = toDateOnlyUTC(projectStartDate);
  const earlyStart = new Map<string, Date>();
  const earlyFinish = new Map<string, Date>();

  for (const code of order) {
    const a = byCode.get(code);
    if (!a) continue;
    const preds = predecessorsByCode.get(code)!;
    const duration = Math.max(a.durationDays, 1);
    let start: Date;
    if (preds.length === 0) {
      start = a.lagDays > 0 ? addBusinessDays(projectStart, a.lagDays, holidaySet) : projectStart;
    } else {
      const finishOfPreds = preds
        .map((p) => earlyFinish.get(p)!)
        .reduce((max, d) => (d > max ? d : max));
      const next = addBusinessDays(finishOfPreds, 1, holidaySet);
      start = a.lagDays > 0 ? addBusinessDays(next, a.lagDays, holidaySet) : next;
    }
    const finish = addBusinessDays(start, duration - 1, holidaySet);
    earlyStart.set(code, start);
    earlyFinish.set(code, finish);
  }

  const projectEnd = order.length
    ? order.map((c) => earlyFinish.get(c)).filter((d): d is Date => !!d).reduce((max, d) => (d > max ? d : max))
    : null;

  const lateFinish = new Map<string, Date>();
  const lateStart = new Map<string, Date>();
  for (let i = order.length - 1; i >= 0; i--) {
    const code = order[i];
    const a = byCode.get(code);
    if (!a) continue;
    const duration = Math.max(a.durationDays, 1);
    const succs = scheduledSuccessors(code);
    let lf: Date;
    if (succs.length === 0) {
      lf = projectEnd!;
    } else {
      lf = succs
        .map((s) => {
          const sa = byCode.get(s)!;
          const ls = lateStart.get(s)!;
          return addBusinessDays(ls, -(sa.lagDays + 1), holidaySet);
        })
        .reduce((min, d) => (d < min ? d : min));
    }
    const ls = addBusinessDays(lf, -(duration - 1), holidaySet);
    lateFinish.set(code, lf);
    lateStart.set(code, ls);
  }

  const todayOnly = toDateOnlyUTC(today);

  function statusAndDeviation(a: CpmActivityInput, es: Date, ef: Date): { status: ActivityStatus; deviationDays: number | null } {
    if (a.actualEnd) {
      return { status: "CONCLUIDO", deviationDays: calendarDaysBetween(ef, a.actualEnd) };
    }
    if (a.actualStart) {
      return { status: "EM_CURSO", deviationDays: null };
    }
    if (todayOnly > es) {
      return { status: "EM_ATRASO_INICIO", deviationDays: null };
    }
    return { status: "NAO_INICIADO", deviationDays: null };
  }

  const results: Record<string, CpmActivityResult> = {};
  for (const code of order) {
    const a = byCode.get(code);
    if (!a) continue;
    const es = earlyStart.get(code)!;
    const ef = earlyFinish.get(code)!;
    const lf = lateFinish.get(code)!;
    const ls = lateStart.get(code)!;
    const totalFloat = businessDaysBetween(ef, lf, holidaySet);

    const succs = scheduledSuccessors(code);
    const freeFloat = succs.length
      ? succs.map((s) => businessDaysBetween(ef, earlyStart.get(s)!, holidaySet)).reduce((min, v) => (v < min ? v : min))
      : totalFloat;

    results[code] = {
      code,
      plannedStart: es,
      plannedEnd: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloatDays: totalFloat,
      freeFloatDays: freeFloat,
      isCritical: totalFloat === 0,
      ...statusAndDeviation(a, es, ef),
    };
  }

  // Activities caught in a dependency cycle can't get real CPM dates — give
  // them an inert placeholder (flagged critical, zero float) so the rest of
  // the app can still render a row for every activity instead of crashing
  // on a missing lookup.
  for (const code of cycleCodes) {
    const a = byCode.get(code);
    if (!a) continue;
    const placeholder = projectStart;
    results[code] = {
      code,
      plannedStart: placeholder,
      plannedEnd: placeholder,
      lateStart: placeholder,
      lateFinish: placeholder,
      totalFloatDays: 0,
      freeFloatDays: 0,
      isCritical: true,
      ...statusAndDeviation(a, placeholder, placeholder),
    };
  }

  return { projectEnd, activities: results, errors };
}

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  NAO_INICIADO: "Não iniciado",
  EM_CURSO: "Em curso",
  CONCLUIDO: "Concluído",
  EM_ATRASO_INICIO: "Em atraso no início",
};
