"use client";

import { useActionState } from "react";
import { uploadDocumentFileAction, type UploadDocumentFileState } from "./actions";

const initialState: UploadDocumentFileState = {};

export function DriveCell({
  projectId,
  documentId,
  hasDriveFolder,
}: {
  projectId: string;
  documentId: string;
  hasDriveFolder: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadDocumentFileAction, initialState);

  if (!hasDriveFolder) {
    return <p className="text-xs text-slate-400">Sem pasta no Drive</p>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input
        type="file"
        name="file"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full max-w-[12rem] text-xs"
      />
      {pending && <p className="mt-0.5 text-xs text-slate-400">A enviar...</p>}
      {state.error && <p className="mt-0.5 max-w-[14rem] text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
