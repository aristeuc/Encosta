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
  if (order.length < activities.length) {
    const missing = activities.map((a) => a.code).filter((c) => !order.includes(c));
    errors.push({ code: missing.join(", "), message: "Ciclo de dependências detetado — verifique os precedentes." });
    for (const c of missing) order.push(c);
  }

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
    const succs = successors.get(code) ?? [];
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
  const results: Record<string, CpmActivityResult> = {};
  for (const code of order) {
    const a = byCode.get(code);
    if (!a) continue;
    const es = earlyStart.get(code)!;
    const ef = earlyFinish.get(code)!;
    const lf = lateFinish.get(code)!;
    const ls = lateStart.get(code)!;
    const totalFloat = businessDaysBetween(ef, lf, holidaySet);

    const succs = successors.get(code) ?? [];
    const freeFloat = succs.length
      ? succs.map((s) => businessDaysBetween(ef, earlyStart.get(s)!, holidaySet)).reduce((min, v) => (v < min ? v : min))
      : totalFloat;

    let status: ActivityStatus;
    let deviationDays: number | null = null;
    if (a.actualEnd) {
      status = "CONCLUIDO";
      deviationDays = calendarDaysBetween(ef, a.actualEnd);
    } else if (a.actualStart) {
      status = "EM_CURSO";
    } else if (todayOnly > es) {
      status = "EM_ATRASO_INICIO";
    } else {
      status = "NAO_INICIADO";
    }

    results[code] = {
      code,
      plannedStart: es,
      plannedEnd: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloatDays: totalFloat,
      freeFloatDays: freeFloat,
      isCritical: totalFloat === 0,
      status,
      deviationDays,
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
