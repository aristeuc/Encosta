"use client";

import { useActionState, useRef, useEffect } from "react";
import { createUserAction, type CreateUserState } from "./actions";

const initialState: CreateUserState = {};

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700">Nome</label>
          <input
            name="name"
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Email</label>
          <input
            name="email"
            type="email"
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Password inicial</label>
          <input
            name="password"
            type="password"
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">WhatsApp (opcional)</label>
          <input
            name="phoneWhatsapp"
            placeholder="+351912345678"
            className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Perfil</label>
          <select name="role" defaultValue="MEMBER" className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm">
            <option value="MEMBER">Membro</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "A adicionar..." : "Adicionar pessoa"}
      </button>
    </form>
  );
}
