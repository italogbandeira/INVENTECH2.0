import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Estrutura mínima de uma origem retornada pela consulta.
 */
type Origem = {
  id: number;
  nome: string;
};

/**
 * GET /api/origens
 *
 * Responsabilidades:
 * - buscar as origens cadastradas
 * - ordenar alfabeticamente por nome
 * - retornar lista simples para uso em filtros e selects
 */
export async function GET() {
  try {
    const origens = await prisma.$queryRaw<Origem[]>`
      SELECT id, nome
      FROM origens
      ORDER BY nome ASC
    `;

    return NextResponse.json(origens);
  } catch (error) {
    console.error("Erro ao buscar origens:", error);

    return NextResponse.json(
      { error: "Erro ao buscar origens" },
      { status: 500 }
    );
  }
}