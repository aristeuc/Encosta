import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getProjectWithSchedule } from "@/lib/schedule";
import { formatDate } from "@/lib/format";
import { isGoogleDriveConfigured } from "@/lib/googleDrive";
import { ActivityTable } from "./ActivityTable";
import { Gantt } from "./Gantt";
import { createDriveFolderAction } from "./actions";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getProjectWithSchedule(id);
  if (!result) notFound();

  const { project, activities, projectEnd, errors } = result;
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  const completed = activities.filter((a) => a.schedule.status === "CONCLUIDO").length;
  const critical = activities.filter((a) => a.schedule.isCritical && a.schedule.status !== "CONCLUIDO");
  const missingDocs = activities.reduce((sum, a) => sum + a.documentsMissing, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-xs text-slate-500 hover:underline">
          ← Painel
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
          <div className="flex items-center gap-2">
            {project.driveFolderUrl ? (
              <a
                href={project.driveFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Pasta no Drive ↗
              </a>
            ) : (
              isGoogleDriveConfigured() && (
                <form action={createDriveFolderAction}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                    Criar pasta no Drive
                  </button>
                </form>
              )
            )}
            <Link
              href={`/projects/${project.id}/documents`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Documentos
            </Link>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Início {formatDate(project.startDate)} · Fim previsto {formatDate(projectEnd)}
        </p>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">Foram detetados problemas nas precedências:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e, i) => (
              <li key={i}>
                {e.code}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Atividades" value={activities.length} />
        <StatCard label="Concluídas" value={`${completed}/${activities.length}`} />
        <StatCard label="No caminho crítico" value={critical.length} tone={critical.length ? "warn" : undefined} />
        <StatCard label="Docs em falta" value={missingDocs} tone={missingDocs ? "warn" : undefined} />
      </div>

      <Gantt activities={activities} rangeStart={project.startDate} rangeEnd={projectEnd ?? project.startDate} />

      <ActivityTable projectId={project.id} activities={activities} users={users} />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: "warn" }) {
  return (
    <div className={`rounded-lg border p-3 ${tone === "warn" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-semibold ${tone === "warn" ? "text-amber-700" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
