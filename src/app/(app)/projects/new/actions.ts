"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createProjectFolder } from "@/lib/googleDrive";

export interface CreateProjectState {
  error?: string;
}

export async function createProjectAction(
  _prevState: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const name = String(formData.get("name") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "");
  const templateSetId = String(formData.get("templateSetId") ?? "");

  if (!name) return { error: "Indique o nome da obra." };
  if (!startDateRaw) return { error: "Indique a data de início." };
  if (!templateSetId) return { error: "Escolha um template de fluxo." };

  const startDate = new Date(`${startDateRaw}T00:00:00.000Z`);

  const templateSet = await prisma.templateSet.findUnique({
    where: { id: templateSetId },
    include: { activities: { include: { documents: true }, orderBy: { orderIndex: "asc" } } },
  });
  if (!templateSet) return { error: "Template de fluxo não encontrado." };

  const users = await prisma.user.findMany();
  const userByName = new Map(users.map((u) => [u.name.trim().toLowerCase(), u.id]));

  const projectId = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: { name, startDate, templateSetId },
    });

    for (const template of templateSet.activities) {
      const matchedUserId = template.internalResponsibleName
        ? userByName.get(template.internalResponsibleName.trim().toLowerCase())
        : undefined;

      const activity = await tx.projectActivity.create({
        data: {
          projectId: project.id,
          code: template.code,
          phase: template.phase,
          activity: template.activity,
          internalResponsibleId: matchedUserId ?? null,
          externalEntity: template.externalEntity,
          durationDays: template.durationDays,
          predecessorCodes: template.predecessorCodes,
          lagDays: template.lagDays,
          deliverable: template.deliverable,
          orderIndex: template.orderIndex,
        },
      });

      if (template.documents.length) {
        await tx.projectDocument.createMany({
          data: template.documents.map((d) => ({
            projectActivityId: activity.id,
            description: d.description,
            owner: d.owner,
            mandatory: d.mandatory,
            orderIndex: d.orderIndex,
          })),
        });
      }
    }

    return project.id;
  });

  // Best-effort: a Drive folder is a nice-to-have, not a reason to fail obra creation.
  const folder = await createProjectFolder(name);
  if (folder.ok) {
    await prisma.project.update({
      where: { id: projectId },
      data: { driveFolderId: folder.id, driveFolderUrl: folder.url },
    });
  }

  redirect(`/projects/${projectId}`);
}
