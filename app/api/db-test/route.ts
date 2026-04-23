import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const funcionario = await prisma.funcionario.findFirst({
      select: {
        id: true,
        nome: true,
        email: true,
        ativo: true,
        perfil: true,
      },
    });

    return NextResponse.json({
      ok: true,
      funcionario,
    });
  } catch (error) {
    console.error("DB TEST ERROR:");
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        erro: "Falha ao consultar o banco.",
        detalhe: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}