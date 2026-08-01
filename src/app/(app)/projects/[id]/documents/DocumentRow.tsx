"use client";

import { useRef } from "react";
import type { ProjectDocument } from "@prisma/client";
import { toInputDate } from "@/lib/format";
import { updateDocumentAction } from "./actions";
import { DriveCell } from "./DriveCell";

export function DocumentRow({
  projectId,
  document,
  hasDriveFolder,
  users,
}: {
  projectId: string;
  document: ProjectDocument;
  hasDriveFolder: boolean;
  users: { id: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const formId = `doc-form-${document.id}`;
  const submit = () => formRef.current?.requestSubmit();

  return (
    <tr>
      <td className="px-4 py-2 text-slate-800">
        {document.description}
        <form ref={formRef} id={formId} action={updateDocumentAction}>
          <input type="hidden" name="documentId" value={document.id} />
          <input type="hidden" name="projectId" value={projectId} />
        </form>
      </td>
      <td className="px-4 py-2">
        <select
          key={`resp-${document.responsibleUserId ?? ""}`}
          form={formId}
          name="responsibleUserId"
          defaultValue={document.responsibleUserId ?? ""}
          onChange={submit}
          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs"
        >
          <option value="">— sem responsável —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
            document.mandatory ? "bg-slate-100 text-slate-600" : "bg-slate-50 text-slate-400"
          }`}
        >
          {document.mandatory ? "Sim" : "Não"}
        </span>
      </td>
      <td className="px-4 py-2">
        {/* key forces a remount when the server value changes, so the uncontrolled
            defaultValue doesn't go stale after a revalidation (see React docs on
            uncontrolled inputs: defaultValue is only honoured on mount). */}
        <select
          key={`status-${document.status}`}
          form={formId}
          name="status"
          defaultValue={document.status}
          onChange={submit}
          className={`rounded border px-1.5 py-1 text-xs ${
            document.status === "OBTIDO" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white"
          }`}
        >
          <option value="PENDENTE">Pendente</option>
          <option value="OBTIDO">Obtido</option>
        </select>
      </td>
      <td className="px-4 py-2">
        <input
          key={`obtained-${toInputDate(document.obtainedDate)}`}
          type="date"
          form={formId}
          name="obtainedDate"
          defaultValue={toInputDate(document.obtainedDate)}
          onChange={submit}
          className="rounded border border-slate-200 px-1.5 py-1 text-xs"
        />
      </td>
      <td className="px-4 py-2">
        <DriveCell
          projectId={projectId}
          documentId={document.id}
          driveFileUrl={document.driveFileUrl}
          hasDriveFolder={hasDriveFolder}
        />
        <input
          key={`drive-${document.driveFileUrl}`}
          type="url"
          form={formId}
          name="driveFileUrl"
          placeholder="ou colar link manualmente"
          defaultValue={document.driveFileUrl ?? ""}
          onBlur={submit}
          className="mt-1 block w-40 rounded border border-slate-200 px-1.5 py-1 text-[11px]"
        />
      </td>
      <td className="px-4 py-2">
        <input
          key={`notes-${document.notes}`}
          type="text"
          form={formId}
          name="notes"
          placeholder="observações"
          defaultValue={document.notes ?? ""}
          onBlur={submit}
          className="block w-48 rounded border border-slate-200 px-1.5 py-1 text-xs"
        />
      </td>
    </tr>
  );
}
