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
 * Retorna a lista de setores ordenada alfabeticamente.
 *
 * Observação:
 * aqui foi usado $queryRaw em vez de prisma.setores.findMany().
 * Isso pode ter sido uma escolha por simplicidade, compatibilidade
 * ou preferência por SQL explícito.
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