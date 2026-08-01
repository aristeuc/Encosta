"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export interface CreateUserState {
  error?: string;
}

export async function createUserAction(_prevState: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const phoneWhatsapp = String(formData.get("phoneWhatsapp") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "MEMBER") === "ADMIN" ? "ADMIN" : "MEMBER";

  if (!name || !email || !password) {
    return { error: "Preencha nome, email e password." };
  }
  if (phoneWhatsapp && !/^\+\d{8,15}$/.test(phoneWhatsapp)) {
    return { error: "O telefone de WhatsApp deve estar no formato internacional, ex.: +351912345678." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Já existe um utilizador com este email." };

  await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), phoneWhatsapp, role },
  });

  revalidatePath("/users");
  return {};
}

export interface UpdateUserState {
  error?: string;
}

export async function updateUserAction(_prevState: UpdateUserState, formData: FormData): Promise<UpdateUserState> {
  const userId = String(formData.get("userId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phoneWhatsapp = String(formData.get("phoneWhatsapp") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "MEMBER") === "ADMIN" ? "ADMIN" : "MEMBER";
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!userId) return { error: "Utilizador inválido." };
  if (!name || !email) return { error: "Preencha nome e email." };
  if (phoneWhatsapp && !/^\+\d{8,15}$/.test(phoneWhatsapp)) {
    return { error: "O telefone de WhatsApp deve estar no formato internacional, ex.: +351912345678." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    return { error: "Já existe outro utilizador com este email." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      phoneWhatsapp,
      role,
      ...(newPassword ? { passwordHash: await hashPassword(newPassword) } : {}),
    },
  });

  revalidatePath("/users");
  return {};
}

export interface DeleteUserState {
  error?: string;
}

export async function deleteUserAction(_prevState: DeleteUserState, formData: FormData): Promise<DeleteUserState> {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Utilizador inválido." };

  const currentUser = await getCurrentUser();
  if (currentUser?.id === userId) {
    return { error: "Não pode apagar a sua própria conta enquanto tem sessão iniciada com ela." };
  }

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/users");
  return {};
}
