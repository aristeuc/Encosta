import { prisma } from "./prisma";
import { computeSchedule, type CpmActivityResult } from "./cpm";

export interface ProjectActivityWithSchedule {
  id: string;
  code: string;
  phase: string;
  activity: string;
  internalResponsibleId: string | null;
  internalResponsibleName: string | null;
  externalEntity: string | null;
  durationDays: number;
  predecessorCodes: string;
  lagDays: number;
  deliverable: string | null;
  orderIndex: number;
  actualStart: Date | null;
  actualEnd: Date | null;
  schedule: CpmActivityResult;
  documentsTotal: number;
  documentsMissing: number;
}

export async function getAllHolidays(): Promise<Date[]> {
  const holidays = await prisma.holiday.findMany();
  return holidays.map((h) => h.date);
}

export async function getProjectWithSchedule(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      activities: {
        include: {
          internalResponsible: true,
          documents: true,
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });
  if (!project) return null;

  const holidays = await getAllHolidays();
  const cpmResult = computeSchedule(
    project.activities.map((a) => ({
      code: a.code,
      durationDays: a.durationDays,
      predecessorCodes: a.predecessorCodes ? a.predecessorCodes.split(",").map((s) => s.trim()).filter(Boolean) : [],
      lagDays: a.lagDays,
      actualStart: a.actualStart,
      actualEnd: a.actualEnd,
    })),
    project.startDate,
    holidays,
  );

  const activities: ProjectActivityWithSchedule[] = project.activities.map((a) => {
    const mandatoryDocs = a.documents.filter((d) => d.mandatory);
    const missing = mandatoryDocs.filter((d) => d.status !== "OBTIDO");
    return {
      id: a.id,
      code: a.code,
      phase: a.phase,
      activity: a.activity,
      internalResponsibleId: a.internalResponsibleId,
      internalResponsibleName: a.internalResponsible?.name ?? null,
      externalEntity: a.externalEntity,
      durationDays: a.durationDays,
      predecessorCodes: a.predecessorCodes ?? "",
      lagDays: a.lagDays,
      deliverable: a.deliverable,
      orderIndex: a.orderIndex,
      actualStart: a.actualStart,
      actualEnd: a.actualEnd,
      schedule: cpmResult.activities[a.code],
      documentsTotal: mandatoryDocs.length,
      documentsMissing: missing.length,
    };
  });

  return {
    project,
    activities,
    projectEnd: cpmResult.projectEnd,
    errors: cpmResult.errors,
  };
}

export interface ProjectSummary {
  id: string;
  name: string;
  startDate: Date;
  projectEnd: Date | null;
  totalActivities: number;
  completedActivities: number;
  criticalActivities: number;
  overdueActivities: number;
  nextDeadline: { code: string; activity: string; date: Date } | null;
}

export async function getAllProjectSummaries(): Promise<ProjectSummary[]> {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } });
  const summaries: ProjectSummary[] = [];

  for (const project of projects) {
    const result = await getProjectWithSchedule(project.id);
    if (!result) continue;
    const { activities, projectEnd } = result;

    const completed = activities.filter((a) => a.schedule.status === "CONCLUIDO").length;
    const critical = activities.filter((a) => a.schedule.isCritical && a.schedule.status !== "CONCLUIDO").length;
    const overdue = activities.filter(
      (a) => a.schedule.status === "EM_ATRASO_INICIO" || (a.schedule.status === "EM_CURSO" && new Date() > a.schedule.plannedEnd),
    ).length;

    const upcoming = activities
      .filter((a) => a.schedule.status !== "CONCLUIDO")
      .map((a) => ({
        code: a.code,
        activity: a.activity,
        date: a.actualStart ? a.schedule.plannedEnd : a.schedule.plannedStart,
      }))
      .sort((x, y) => x.date.getTime() - y.date.getTime());

    summaries.push({
      id: project.id,
      name: project.name,
      startDate: project.startDate,
      projectEnd,
      totalActivities: activities.length,
      completedActivities: completed,
      criticalActivities: critical,
      overdueActivities: overdue,
      nextDeadline: upcoming[0] ?? null,
    });
  }

  return summaries;
}
