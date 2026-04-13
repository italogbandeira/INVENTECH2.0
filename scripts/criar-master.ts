import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

/**
 * Script para criar um usuário master específico.
 *
 * Este arquivo tem mais logs no console para facilitar
 * depuração durante configuração inicial.
 */
async function main() {
  const email = "italogabrie33@gmail.com";
  const senha = "Rogusbr123";
  const nome = "Ítalo Gabriel";

  console.log("Iniciando criação do master...");
  console.log("Email:", email);

  const existente = await prisma.funcionario.findUnique({
    where: { email },
  });

  console.log("Resultado da busca por email:", existente);

  if (existente) {
    console.log("Já existe um funcionário com esse email.");
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  console.log("Hash gerado com sucesso.");

  const novo = await prisma.funcionario.create({
    data: {
      nome,
      email,
      senhaHash,
      ativo: true,
      perfil: "master",
    },
  });

  console.log("Master criado com sucesso.");
  console.log(novo);
}

main()
  .catch((e) => {
    console.error("Erro ao criar master:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });