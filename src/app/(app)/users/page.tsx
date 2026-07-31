import { prisma } from "@/lib/prisma";
import { UserForm } from "./UserForm";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Equipa</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pessoas que podem ser atribuídas como responsáveis por atividades e recebem avisos de prazos por email e
          WhatsApp.
        </p>
      </div>

      <UserForm />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">WhatsApp</th>
              <th className="px-4 py-2">Perfil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 text-slate-800">{u.name}</td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2 text-slate-600">{u.phoneWhatsapp ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600">{u.role === "ADMIN" ? "Administrador" : "Membro"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
