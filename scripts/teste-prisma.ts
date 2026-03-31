import { prisma } from "../lib/prisma";

async function main() {
  const total = await prisma.funcionario.count();
  console.log("Funcionários:", total);
}

main()
  .catch((error) => {
    console.error("Erro no teste Prisma:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });