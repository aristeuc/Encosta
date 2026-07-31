import Link from "next/link";
import { getAllProjectSummaries } from "@/lib/schedule";
import { formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const summaries = await getAllProjectSummaries();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Painel de obras</h1>
        <Link
          href="/projects/new"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Nova obra
        </Link>
      </div>

      {summaries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Ainda não há nenhuma obra criada.{" "}
          <Link href="/projects/new" className="text-slate-900 underline">
            Criar a primeira obra
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((s) => {
            const pct = s.totalActivities ? Math.round((s.completedActivities / s.totalActivities) * 100) : 0;
            return (
              <Link
                key={s.id}
                href={`/projects/${s.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 hover:shadow"
              >
                <h2 className="text-lg font-semibold text-slate-900">{s.name}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Início {formatDate(s.startDate)} · Fim previsto {formatDate(s.projectEnd)}
                </p>

                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Progresso</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md bg-slate-50 p-2">
                    <dt className="text-slate-500">Atividades</dt>
                    <dd className="text-base font-semibold text-slate-900">{s.totalActivities}</dd>
                  </div>
                  <div className={`rounded-md p-2 ${s.criticalActivities > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
                    <dt className="text-slate-500">Críticas</dt>
                    <dd className={`text-base font-semibold ${s.criticalActivities > 0 ? "text-amber-700" : "text-slate-900"}`}>
                      {s.criticalActivities}
                    </dd>
                  </div>
                  <div className={`rounded-md p-2 ${s.overdueActivities > 0 ? "bg-red-50" : "bg-slate-50"}`}>
                    <dt className="text-slate-500">Em atraso</dt>
                    <dd className={`text-base font-semibold ${s.overdueActivities > 0 ? "text-red-700" : "text-slate-900"}`}>
                      {s.overdueActivities}
                    </dd>
                  </div>
                </dl>

                {s.nextDeadline && (
                  <p className="mt-3 text-xs text-slate-500">
                    Próximo prazo: <span className="font-medium text-slate-700">{s.nextDeadline.activity}</span> em{" "}
                    {formatDate(s.nextDeadline.date)}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
