import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Estrutura mínima de um tipo de equipamento retornado pela consulta.
 */
type TipoEquipamento = {
  id: number;
  nome: string;
};

/**
 * GET /api/tipos-equipamento
 *
 * Responsabilidades:
 * - buscar os tipos de equipamento cadastrados
 * - ordenar alfabeticamente por nome
 * - retornar uma lista simples para alimentar selects e filtros
 *
 * Observação:
 * a consulta foi feita com $queryRaw em SQL direto.
 * Em uma futura refatoração, isso também poderia ser feito com:
 * prisma.tipos_equipamento.findMany(...)
 */
export async function GET() {
  try {
    const tipos = await prisma.$queryRaw<TipoEquipamento[]>`
      SELECT id, nome
      FROM tipos_equipamento
      ORDER BY nome ASC
    `;

    return NextResponse.json(tipos);
  } catch (error) {
    console.error("Erro ao buscar tipos de equipamento:", error);

    return NextResponse.json(
      { error: "Erro ao buscar tipos de equipamento" },
      { status: 500 }
    );
  }
}