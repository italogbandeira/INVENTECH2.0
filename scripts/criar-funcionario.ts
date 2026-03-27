import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = "aldemir@empresa.com";

  const existente = await prisma.funcionario.findUnique({
    where: { email },
  });

  if (existente) {
    console.log("Esse funcionário já existe.");
    return;
  }

  const senhaHash = await bcrypt.hash("123456", 10);

  await prisma.funcionario.create({
    data: {
      nome: "Aldemir",
      email,
      senhaHash,
      ativo: true,
      perfil: "master",
    },
  });

  console.log("Funcionário master criado com sucesso.");
}

main()
  .catch((e) => {
    console.error("Erro ao criar funcionário:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });