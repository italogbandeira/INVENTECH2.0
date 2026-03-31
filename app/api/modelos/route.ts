import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Modelo = {
  id: number;
  nome: string;
};

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