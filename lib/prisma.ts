import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../app/generated/prisma/client";

/**
 * Tipagem do objeto global para reaproveitar a instância do Prisma
 * em ambiente de desenvolvimento.
 *
 * Isso evita múltiplas conexões abertas durante hot reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * Adapter do Prisma para MariaDB.
 *
 * Os dados vêm das variáveis de ambiente, com fallbacks locais
 * para facilitar desenvolvimento.
 */
const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "",
  allowPublicKeyRetrieval: true,
  connectionLimit: 5,
});

/**
 * Reaproveita a instância existente em dev ou cria uma nova.
 */
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

/**
 * Em desenvolvimento, guardamos a instância no escopo global
 * para evitar recriação a cada reload do Next.
 */
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };
export default prisma;