"use client";

import { useActionState } from "react";
import { createDriveFolderAction, type CreateDriveFolderState } from "./actions";

const initialState: CreateDriveFolderState = {};

export function DriveFolderButton({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(createDriveFolderAction, initialState);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
        >
          {pending ? "A criar pasta..." : "Criar pasta no Drive"}
        </button>
      </form>
      {state.error && <p className="mt-1 max-w-xs text-right text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
