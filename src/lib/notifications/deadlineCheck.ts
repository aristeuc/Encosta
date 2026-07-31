import { prisma } from "@/lib/prisma";
import { getAllProjectSummaries, getProjectWithSchedule } from "@/lib/schedule";
import { calendarDaysBetween, toDateOnlyUTC } from "@/lib/businessDays";
import { formatDate } from "@/lib/format";
import { sendEmail } from "./email";
import { sendWhatsApp } from "./whatsapp";
import type { NotificationChannel, NotificationTrigger } from "@prisma/client";

/** How many days before a planned date to send an early warning. */
const UPCOMING_THRESHOLDS_DAYS = [7, 3, 1];

export interface DeadlineCheckSummary {
  activitiesChecked: number;
  notificationsSent: number;
  notificationsFailed: number;
  notificationsSkippedAlreadySent: number;
}

function buildMessage(params: {
  projectName: string;
  code: string;
  activity: string;
  targetDate: Date;
  diffDays: number;
  kind: "start" | "end";
}): { subject: string; body: string } {
  const { projectName, code, activity, targetDate, diffDays, kind } = params;
  const what = kind === "start" ? "início previsto" : "fim previsto";
  const when = formatDate(targetDate);

  if (diffDays < 0) {
    const lateDays = Math.abs(diffDays);
    return {
      subject: `[${projectName}] ${code} em atraso há ${lateDays}d`,
      body: `A atividade ${code} — ${activity} (obra "${projectName}") está em atraso: o ${what} era ${when}, já lá vão ${lateDays} dia(s) úteis de calendário.`,
    };
  }
  return {
    subject: `[${projectName}] ${code} — ${what} em ${diffDays}d`,
    body: `A atividade ${code} — ${activity} (obra "${projectName}") tem o ${what} a aproximar-se: ${when} (dentro de ${diffDays} dia(s)).`,
  };
}

async function notifyOnce(params: {
  activityId: string;
  userId: string;
  channel: NotificationChannel;
  trigger: NotificationTrigger;
  windowDate: Date;
  send: () => Promise<{ sent: boolean; error?: string }>;
}): Promise<"sent" | "failed" | "skipped"> {
  const { activityId, userId, channel, trigger, windowDate } = params;
  const existing = await prisma.notificationLog.findUnique({
    where: {
      projectActivityId_userId_channel_trigger_windowDate: {
        projectActivityId: activityId,
        userId,
        channel,
        trigger,
        windowDate,
      },
    },
  });
  if (existing) return "skipped";

  const result = await params.send();
  await prisma.notificationLog.create({
    data: {
      projectActivityId: activityId,
      userId,
      channel,
      trigger,
      windowDate,
      success: result.sent,
      errorMessage: result.error,
    },
  });
  return result.sent ? "sent" : "failed";
}

export async function runDeadlineCheck(now: Date = new Date()): Promise<DeadlineCheckSummary> {
  const today = toDateOnlyUTC(now);
  const summaries = await getAllProjectSummaries();

  const result: DeadlineCheckSummary = {
    activitiesChecked: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
    notificationsSkippedAlreadySent: 0,
  };

  for (const projectSummary of summaries) {
    const full = await getProjectWithSchedule(projectSummary.id);
    if (!full) continue;

    for (const activity of full.activities) {
      if (activity.schedule.status === "CONCLUIDO") continue;
      if (!activity.internalResponsibleId) continue;
      result.activitiesChecked++;

      const kind: "start" | "end" = activity.actualStart ? "end" : "start";
      const targetDate = kind === "start" ? activity.schedule.plannedStart : activity.schedule.plannedEnd;
      const diffDays = calendarDaysBetween(today, targetDate);

      const isUpcomingHit = UPCOMING_THRESHOLDS_DAYS.includes(diffDays);
      const isOverdue = diffDays < 0;
      if (!isUpcomingHit && !isOverdue) continue;

      const trigger: NotificationTrigger = isOverdue
        ? kind === "start"
          ? "OVERDUE_START"
          : "OVERDUE_END"
        : kind === "start"
          ? "UPCOMING_START"
          : "UPCOMING_END";

      const user = await prisma.user.findUnique({ where: { id: activity.internalResponsibleId } });
      if (!user) continue;

      const { subject, body } = buildMessage({
        projectName: full.project.name,
        code: activity.code,
        activity: activity.activity,
        targetDate,
        diffDays,
        kind,
      });

      const emailOutcome = await notifyOnce({
        activityId: activity.id,
        userId: user.id,
        channel: "EMAIL",
        trigger,
        windowDate: today,
        send: () =>
          sendEmail(user.email, subject, `<p>${body}</p><p>— Encosta · Gestão de Obras</p>`),
      });
      tally(result, emailOutcome);

      if (user.phoneWhatsapp) {
        const whatsappOutcome = await notifyOnce({
          activityId: activity.id,
          userId: user.id,
          channel: "WHATSAPP",
          trigger,
          windowDate: today,
          send: () => sendWhatsApp(user.phoneWhatsapp!, body),
        });
        tally(result, whatsappOutcome);
      }
    }
  }

  return result;
}

function tally(result: DeadlineCheckSummary, outcome: "sent" | "failed" | "skipped") {
  if (outcome === "sent") result.notificationsSent++;
  else if (outcome === "failed") result.notificationsFailed++;
  else result.notificationsSkippedAlreadySent++;
}
