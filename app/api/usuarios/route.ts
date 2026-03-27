import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

type Usuario = {
  id: number;
  nome: string;
};

export async function GET() {
  try {
    const usuarios = await prisma.$queryRaw<Usuario[]>`
      SELECT id, nome
      FROM usuarios
      ORDER BY nome ASC
    `;

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);

    return NextResponse.json(
      { error: "Erro ao buscar usuários" },
      { status: 500 }
    );
  }
}