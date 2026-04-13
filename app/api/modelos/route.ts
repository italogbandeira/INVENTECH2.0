import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Estrutura mínima de um modelo retornado pela consulta.
 */
type Modelo = {
  id: number;
  nome: string;
};

/**
 * GET /api/modelos
 *
 * Responsabilidades:
 * - buscar os modelos cadastrados
 * - ordenar alfabeticamente por nome
 * - retornar lista simples para uso em filtros e selects
 *
 * Observação:
 * a rota usa SQL bruto com $queryRaw.
 * Em uma futura refatoração, também poderia usar prisma.modelos.findMany().
 */
export async function GET() {
  try {
    const modelos = await prisma.$queryRaw<Modelo[]>`
      SELECT id, nome
      FROM modelos
      ORDER BY nome ASC
    `;

    return NextResponse.json(modelos);
  } catch (error) {
    console.error("Erro ao buscar modelos:", error);

    return NextResponse.json(
      { error: "Erro ao buscar modelos" },
      { status: 500 }
    );
  }
}