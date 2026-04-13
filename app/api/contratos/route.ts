import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Estrutura mínima de um contrato retornado pela consulta.
 */
type Contrato = {
  id: number;
  nome: string;
};

/**
 * GET /api/contratos
 *
 * Responsabilidades:
 * - buscar contratos cadastrados
 * - ordenar alfabeticamente por nome
 * - retornar lista simples para filtros e selects
 */
export async function GET() {
  try {
    const contratos = await prisma.$queryRaw<Contrato[]>`
      SELECT id, nome
      FROM contratos
      ORDER BY nome ASC
    `;

    return NextResponse.json(contratos);
  } catch (error) {
    console.error("Erro ao buscar contratos:", error);

    return NextResponse.json(
      { error: "Erro ao buscar contratos" },
      { status: 500 }
    );
  }
}