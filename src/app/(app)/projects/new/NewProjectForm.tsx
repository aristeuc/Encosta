"use client";

import { useActionState } from "react";
import { createProjectAction, type CreateProjectState } from "./actions";

const initialState: CreateProjectState = {};

export function NewProjectForm({
  templateSets,
}: {
  templateSets: { id: string; name: string; activitiesCount: number }[];
}) {
  const [state, formAction, pending] = useActionState(createProjectAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Nome da obra
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="ex.: Aroeira Design Village — Lote 12"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-slate-700">
          Data de início do cronograma
        </label>
        <input
          id="startDate"
          name="startDate"
          type="date"
          required
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="templateSetId" className="block text-sm font-medium text-slate-700">
          Fluxo de atividades
        </label>
        <select
          id="templateSetId"
          name="templateSetId"
          required
          defaultValue={templateSets[0]?.id ?? ""}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        >
          {templateSets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.activitiesCount} atividades)
            </option>
          ))}
        </select>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "A criar..." : "Criar obra"}
      </button>
    </form>
  );
}
