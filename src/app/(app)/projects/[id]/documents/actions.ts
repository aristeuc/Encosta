"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { DocumentStatus } from "@prisma/client";
import { uploadFileToFolder } from "@/lib/googleDrive";

function parseDateInput(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return new Date(`${raw}T00:00:00.000Z`);
}

export async function updateDocumentAction(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!documentId || !projectId) return;

  const status = String(formData.get("status") ?? "PENDENTE") as DocumentStatus;
  const obtainedDate = parseDateInput(formData.get("obtainedDate"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const driveFileUrl = String(formData.get("driveFileUrl") ?? "").trim() || null;

  await prisma.projectDocument.update({
    where: { id: documentId },
    data: { status, obtainedDate, notes, driveFileUrl },
  });

  revalidatePath(`/projects/${projectId}/documents`);
  revalidatePath(`/projects/${projectId}`);
}

export interface UploadDocumentFileState {
  error?: string;
}

export async function uploadDocumentFileAction(
  _prevState: UploadDocumentFileState,
  formData: FormData,
): Promise<UploadDocumentFileState> {
  const documentId = String(formData.get("documentId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const file = formData.get("file");

  if (!documentId || !projectId) return { error: "Documento inválido." };
  if (!(file instanceof File) || file.size === 0) return { error: "Escolha um ficheiro." };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project?.driveFolderId) {
    return { error: "Esta obra ainda não tem pasta no Google Drive." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadFileToFolder(project.driveFolderId, file.name, file.type || "application/octet-stream", buffer);
  if (!result.ok) {
    return { error: result.error ?? "Falha ao enviar o ficheiro para o Google Drive." };
  }

  await prisma.projectDocument.update({
    where: { id: documentId },
    data: { driveFileId: result.id, driveFileUrl: result.url, status: "OBTIDO" },
  });

  revalidatePath(`/projects/${projectId}/documents`);
  revalidatePath(`/projects/${projectId}`);
  return {};
}
