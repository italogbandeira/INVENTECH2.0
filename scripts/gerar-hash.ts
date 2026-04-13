import bcrypt from "bcryptjs";

/**
 * Script simples para gerar um hash bcrypt de teste.
 *
 * Útil para:
 * - testes manuais
 * - validar senha no banco
 * - comparar comportamento do bcrypt
 */
async function main() {
  const hash = await bcrypt.hash("123456", 10);
  console.log(hash);
}

main();