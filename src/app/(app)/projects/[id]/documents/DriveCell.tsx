"use client";

import { useActionState } from "react";
import { uploadDocumentFileAction, type UploadDocumentFileState } from "./actions";

const initialState: UploadDocumentFileState = {};

export function DriveCell({
  projectId,
  documentId,
  driveFileUrl,
  hasDriveFolder,
}: {
  projectId: string;
  documentId: string;
  driveFileUrl: string | null;
  hasDriveFolder: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadDocumentFileAction, initialState);

  return (
    <div className="space-y-1">
      {driveFileUrl && (
        <a href={driveFileUrl} target="_blank" rel="noreferrer" className="block text-xs text-sky-700 underline">
          Abrir ficheiro ↗
        </a>
      )}
      {hasDriveFolder ? (
        <form action={formAction} className="flex items-center gap-1">
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="projectId" value={projectId} />
          <input
            type="file"
            name="file"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="w-36 text-[11px]"
          />
          {pending && <span className="text-[11px] text-slate-400">a enviar...</span>}
        </form>
      ) : (
        <p className="text-[11px] text-slate-400">Sem pasta no Drive</p>
      )}
      {state.error && <p className="text-[11px] text-red-600">{state.error}</p>}
    </div>
  );
}
