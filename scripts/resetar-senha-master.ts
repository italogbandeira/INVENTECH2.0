import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

/**
 * Script utilitário para resetar a senha de um funcionário master.
 *
 * Uso comum:
 * - recuperação de acesso em ambiente local
 * - suporte administrativo
 * - setup inicial
 */
async function main() {
  const email = "italogabrie33@gmail.com";
  const novaSenha = "Rogusbr123";

  const senhaHash = await bcrypt.hash(novaSenha, 10);

  const funcionario = await prisma.funcionario.update({
    where: { email },
    data: { senhaHash, ativo: true },
  });

  console.log("Senha resetada com sucesso para:", funcionario.email);
}

main()
  .catch((error) => {
    console.error("Erro ao resetar senha:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });