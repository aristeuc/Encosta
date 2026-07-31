import { runDeadlineCheck } from "../src/lib/notifications/deadlineCheck";
import { prisma } from "../src/lib/prisma";

async function main() {
  const summary = await runDeadlineCheck();
  console.log("Verificação de prazos concluída:", summary);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
