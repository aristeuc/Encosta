import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DocumentRow } from "./DocumentRow";

export default async function ProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      activities: {
        include: { documents: { orderBy: { orderIndex: "asc" } } },
        orderBy: { orderIndex: "asc" },
      },
    },
  });
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${project.id}`} className="text-xs text-slate-500 hover:underline">
          ← {project.name}
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Documentos por atividade</h1>
          {project.driveFolderUrl && (
            <a href={project.driveFolderUrl} target="_blank" rel="noreferrer" className="text-sm text-sky-700 underline">
              Abrir pasta no Drive ↗
            </a>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Marque cada documento como obtido assim que estiver disponível. Isso determina se a atividade está pronta
          para avançar. Pode enviar o ficheiro diretamente para o Google Drive da obra.
        </p>
      </div>

      <div className="space-y-6">
        {project.activities.map((activity) => {
          const missing = activity.documents.filter((d) => d.mandatory && d.status !== "OBTIDO");
          return (
            <section
              key={activity.id}
              id={activity.code}
              className="scroll-mt-20 rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <span className="font-mono text-xs text-slate-400">{activity.code}</span>{" "}
                  <span className="font-medium text-slate-800">{activity.activity}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    missing.length ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {missing.length ? `NÃO — faltam ${missing.length}` : "Pronto para avançar"}
                </span>
              </div>

              {activity.documents.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-400">Sem documentos associados.</p>
              ) : (
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-2">Documento</th>
                      <th className="px-4 py-2">Quem obtém</th>
                      <th className="px-4 py-2">Obrigatório</th>
                      <th className="px-4 py-2">Estado</th>
                      <th className="px-4 py-2">Data obtida</th>
                      <th className="px-4 py-2">Google Drive</th>
                      <th className="px-4 py-2">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activity.documents.map((doc) => (
                      <DocumentRow
                        key={doc.id}
                        projectId={project.id}
                        document={doc}
                        hasDriveFolder={Boolean(project.driveFolderId)}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
