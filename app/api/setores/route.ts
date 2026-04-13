import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Estrutura mínima de um setor retornado pela consulta.
 */
type Setor = {
  id: number;
  nome: string;
};

/**
 * GET /api/setores
 *
 * Responsabilidades:
 * - buscar os setores cadastrados
 * - ordenar alfabeticamente por nome
 * - retornar uma lista simples para alimentar filtros e selects
 *
 * Observação:
 * esta rota usa SQL bruto com $queryRaw.
 */
export async function GET() {
  try {
    const setores = await prisma.$queryRaw<Setor[]>`
      SELECT id, nome
      FROM setores
      ORDER BY nome ASC
    `;

    return NextResponse.json(setores);
  } catch (error) {
    console.error("Erro ao buscar setores:", error);

    return NextResponse.json(
      { error: "Erro ao buscar setores" },
      { status: 500 }
    );
  }
}