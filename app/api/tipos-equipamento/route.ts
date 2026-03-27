import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

type TipoEquipamento = {
  id: number;
  nome: string;
};

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