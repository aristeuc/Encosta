import { readFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface FluxoFixture {
  templateSetName: string;
  activities: Array<{
    code: string;
    phase: string;
    activity: string;
    internalResponsibleName: string | null;
    externalEntity: string | null;
    durationDays: number;
    predecessorCodes: string[];
    lagDays: number;
    deliverable: string | null;
  }>;
  documents: Array<{
    activityCode: string;
    description: string;
    owner: string | null;
    mandatory: boolean;
  }>;
  holidays: Array<{ date: string; description: string }>;
}

async function main() {
  const fixturePath = path.join(__dirname, "seed-data", "fluxo-obra-padrao.json");
  const fixture = JSON.parse(readFileSync(fixturePath, "utf-8")) as FluxoFixture;

  console.log("A semear feriados...");
  for (const h of fixture.holidays) {
    await prisma.holiday.upsert({
      where: { date: new Date(`${h.date}T00:00:00.000Z`) },
      update: { description: h.description },
      create: { date: new Date(`${h.date}T00:00:00.000Z`), description: h.description },
    });
  }

  console.log("A semear o template padrão...");
  const templateSet = await prisma.templateSet.upsert({
    where: { name: fixture.templateSetName },
    update: {},
    create: {
      name: fixture.templateSetName,
      description:
        "Fluxo desde a contratação de projetistas de loteamento até à escritura e entrega de chaves, com documentos obrigatórios por atividade.",
    },
  });

  for (const [index, a] of fixture.activities.entries()) {
    const template = await prisma.activityTemplate.upsert({
      where: { templateSetId_code: { templateSetId: templateSet.id, code: a.code } },
      update: {
        phase: a.phase,
        activity: a.activity,
        internalResponsibleName: a.internalResponsibleName,
        externalEntity: a.externalEntity,
        durationDays: a.durationDays,
        predecessorCodes: a.predecessorCodes.join(","),
        lagDays: a.lagDays,
        deliverable: a.deliverable,
        orderIndex: index,
      },
      create: {
        templateSetId: templateSet.id,
        code: a.code,
        phase: a.phase,
        activity: a.activity,
        internalResponsibleName: a.internalResponsibleName,
        externalEntity: a.externalEntity,
        durationDays: a.durationDays,
        predecessorCodes: a.predecessorCodes.join(","),
        lagDays: a.lagDays,
        deliverable: a.deliverable,
        orderIndex: index,
      },
    });

    const docs = fixture.documents.filter((d) => d.activityCode === a.code);
    // Recreate the document list for this activity template to keep seeding idempotent.
    await prisma.documentTemplate.deleteMany({ where: { activityTemplateId: template.id } });
    if (docs.length) {
      await prisma.documentTemplate.createMany({
        data: docs.map((d, i) => ({
          activityTemplateId: template.id,
          description: d.description,
          owner: d.owner,
          mandatory: d.mandatory,
          orderIndex: i,
        })),
      });
    }
  }

  console.log("A criar utilizador administrador de exemplo...");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@encosta.pt";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "muda-esta-password";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Administrador",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
    },
  });

  console.log(
    `Seed concluído. ${fixture.activities.length} atividades, ${fixture.documents.length} documentos, ${fixture.holidays.length} feriados.`,
  );
  console.log(`Utilizador admin: ${adminEmail} / senha: ${adminPassword} (mude após o primeiro login)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
