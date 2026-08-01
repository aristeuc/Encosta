"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createProjectFolder } from "@/lib/googleDrive";

function parseDateInput(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return new Date(`${raw}T00:00:00.000Z`);
}

export async function updateActivityDatesAction(formData: FormData) {
  const activityId = String(formData.get("activityId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!activityId || !projectId) return;

  const actualStart = parseDateInput(formData.get("actualStart"));
  const actualEnd = parseDateInput(formData.get("actualEnd"));

  await prisma.projectActivity.update({
    where: { id: activityId },
    data: { actualStart, actualEnd },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateActivityResponsibleAction(formData: FormData) {
  const activityId = String(formData.get("activityId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const userId = String(formData.get("internalResponsibleId") ?? "");
  if (!activityId || !projectId) return;

  await prisma.projectActivity.update({
    where: { id: activityId },
    data: { internalResponsibleId: userId || null },
  });

  revalidatePath(`/projects/${projectId}`);
}

export interface CreateDriveFolderState {
  error?: string;
}

export async function createDriveFolderAction(
  _prevState: CreateDriveFolderState,
  formData: FormData,
): Promise<CreateDriveFolderState> {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { error: "Obra inválida." };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Obra não encontrada." };
  if (project.driveFolderId) return {};

  const folder = await createProjectFolder(project.name);
  if (!folder.ok) {
    return { error: folder.error ?? "Falha desconhecida ao criar a pasta no Google Drive." };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { driveFolderId: folder.id, driveFolderUrl: folder.url },
  });

  revalidatePath(`/projects/${projectId}`);
  return {};
}
