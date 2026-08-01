"use client";

import { useActionState, useRef } from "react";
import type { User } from "@prisma/client";
import { updateUserAction, deleteUserAction, type UpdateUserState, type DeleteUserState } from "./actions";

const initialUpdateState: UpdateUserState = {};
const initialDeleteState: DeleteUserState = {};

export function UserRow({ user, isCurrentUser }: { user: User; isCurrentUser: boolean }) {
  const [updateState, updateFormAction] = useActionState(updateUserAction, initialUpdateState);
  const [deleteState, deleteFormAction] = useActionState(deleteUserAction, initialDeleteState);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = `user-form-${user.id}`;
  const submit = () => formRef.current?.requestSubmit();

  return (
    <>
      <tr>
        <td className="px-4 py-2">
          <form ref={formRef} id={formId} action={updateFormAction}>
            <input type="hidden" name="userId" value={user.id} />
          </form>
          <input
            key={`name-${user.name}`}
            type="text"
            form={formId}
            name="name"
            defaultValue={user.name}
            onBlur={submit}
            className="w-32 rounded border border-slate-200 px-1.5 py-1 text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <input
            key={`email-${user.email}`}
            type="email"
            form={formId}
            name="email"
            defaultValue={user.email}
            onBlur={submit}
            className="w-48 rounded border border-slate-200 px-1.5 py-1 text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <input
            key={`phone-${user.phoneWhatsapp ?? ""}`}
            type="text"
            form={formId}
            name="phoneWhatsapp"
            placeholder="+351912345678"
            defaultValue={user.phoneWhatsapp ?? ""}
            onBlur={submit}
            className="w-36 rounded border border-slate-200 px-1.5 py-1 text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <select
            key={`role-${user.role}`}
            form={formId}
            name="role"
            defaultValue={user.role}
            onChange={submit}
            className="rounded border border-slate-200 bg-white px-1.5 py-1 text-sm"
          >
            <option value="MEMBER">Membro</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </td>
        <td className="px-4 py-2">
          <input
            type="password"
            form={formId}
            name="newPassword"
            placeholder="nova password"
            onBlur={submit}
            className="w-32 rounded border border-slate-200 px-1.5 py-1 text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <form
            action={deleteFormAction}
            onSubmit={(e) => {
              if (!confirm(`Apagar ${user.name}? Esta ação não pode ser desfeita.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="userId" value={user.id} />
            <button
              type="submit"
              disabled={isCurrentUser}
              title={isCurrentUser ? "Não pode apagar a sua própria conta" : undefined}
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apagar
            </button>
          </form>
        </td>
      </tr>
      {(updateState.error || deleteState.error) && (
        <tr>
          <td colSpan={6} className="px-4 pb-2 text-xs text-red-600">
            {updateState.error || deleteState.error}
          </td>
        </tr>
      )}
    </>
  );
}
