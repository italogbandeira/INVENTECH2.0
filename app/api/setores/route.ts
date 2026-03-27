import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

type Setor = {
  id: number;
  nome: string;
};

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