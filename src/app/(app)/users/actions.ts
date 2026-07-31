"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

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
