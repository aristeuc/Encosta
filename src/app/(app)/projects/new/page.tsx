import { prisma } from "@/lib/prisma";
import { NewProjectForm } from "./NewProjectForm";

export default async function NewProjectPage() {
  const templateSets = await prisma.templateSet.findMany({
    include: { _count: { select: { activities: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900">Nova obra</h1>
      <p className="mt-1 text-sm text-slate-500">
        A obra nasce com uma cópia do fluxo escolhido — pode depois personalizar durações, precedências e
        responsáveis sem afetar outras obras.
      </p>
      <NewProjectForm
        templateSets={templateSets.map((t) => ({ id: t.id, name: t.name, activitiesCount: t._count.activities }))}
      />
    </div>
  );
}
