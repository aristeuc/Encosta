"use client";

import { useRef } from "react";
import Link from "next/link";
import type { ProjectActivityWithSchedule } from "@/lib/schedule";
import { ACTIVITY_STATUS_LABELS } from "@/lib/cpm";
import { formatDate, toInputDate } from "@/lib/format";
import { updateActivityDatesAction, updateActivityResponsibleAction } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  CONCLUIDO: "bg-emerald-50 text-emerald-700",
  EM_CURSO: "bg-sky-50 text-sky-700",
  EM_ATRASO_INICIO: "bg-red-50 text-red-700",
  NAO_INICIADO: "bg-slate-100 text-slate-600",
};

export function ActivityTable({
  projectId,
  activities,
  users,
}: {
  projectId: string;
  activities: ProjectActivityWithSchedule[];
  users: { id: string; name: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Atividade</th>
            <th className="px-3 py-2">Responsável</th>
            <th className="px-3 py-2">Início previsto</th>
            <th className="px-3 py-2">Fim previsto</th>
            <th className="px-3 py-2">Início real</th>
            <th className="px-3 py-2">Fim real</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Desvio</th>
            <th className="px-3 py-2">Folga</th>
            <th className="px-3 py-2">Docs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {activities.map((a) => (
            <ActivityRow key={a.id} projectId={projectId} activity={a} users={users} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityRow({
  projectId,
  activity: a,
  users,
}: {
  projectId: string;
  activity: ProjectActivityWithSchedule;
  users: { id: string; name: string }[];
}) {
  const datesFormRef = useRef<HTMLFormElement>(null);
  const responsibleFormRef = useRef<HTMLFormElement>(null);
  const datesFormId = `dates-form-${a.id}`;

  return (
    <tr className={a.schedule.isCritical && a.schedule.status !== "CONCLUIDO" ? "bg-red-50/40" : undefined}>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-500">{a.code}</td>
      <td className="px-3 py-2">
        <div className="max-w-xs text-slate-800">{a.activity}</div>
        <div className="text-[11px] text-slate-400">{a.phase}</div>
      </td>
      <td className="px-3 py-2">
        <form ref={responsibleFormRef} action={updateActivityResponsibleAction}>
          <input type="hidden" name="activityId" value={a.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <select
            key={`resp-${a.internalResponsibleId ?? ""}`}
            name="internalResponsibleId"
            defaultValue={a.internalResponsibleId ?? ""}
            onChange={() => responsibleFormRef.current?.requestSubmit()}
            className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs"
          >
            <option value="">— sem responsável —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </form>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDate(a.schedule.plannedStart)}</td>
      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDate(a.schedule.plannedEnd)}</td>
      <td className="whitespace-nowrap px-3 py-2">
        {/* Hidden form: both date inputs below reference it via the `form` attribute,
            even though they live in separate <td> cells. */}
        <form ref={datesFormRef} id={datesFormId} action={updateActivityDatesAction}>
          <input type="hidden" name="activityId" value={a.id} />
          <input type="hidden" name="projectId" value={projectId} />
        </form>
        <input
          key={`start-${toInputDate(a.actualStart)}`}
          type="date"
          form={datesFormId}
          name="actualStart"
          defaultValue={toInputDate(a.actualStart)}
          onChange={() => datesFormRef.current?.requestSubmit()}
          className="rounded border border-amber-200 bg-amber-50 px-1.5 py-1 text-xs"
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <input
          key={`end-${toInputDate(a.actualEnd)}`}
          type="date"
          form={datesFormId}
          name="actualEnd"
          defaultValue={toInputDate(a.actualEnd)}
          onChange={() => datesFormRef.current?.requestSubmit()}
          className="rounded border border-amber-200 bg-amber-50 px-1.5 py-1 text-xs"
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[a.schedule.status]}`}>
          {ACTIVITY_STATUS_LABELS[a.schedule.status]}
        </span>
        {a.schedule.isCritical && (
          <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
            CRÍTICO
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
        {a.schedule.deviationDays === null
          ? "—"
          : a.schedule.deviationDays > 0
            ? `+${a.schedule.deviationDays}d`
            : `${a.schedule.deviationDays}d`}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{a.schedule.totalFloatDays}d</td>
      <td className="whitespace-nowrap px-3 py-2">
        <Link href={`/projects/${projectId}/documents#${a.code}`} className="text-xs text-slate-600 underline">
          {a.documentsTotal - a.documentsMissing}/{a.documentsTotal}
        </Link>
      </td>
    </tr>
  );
}
