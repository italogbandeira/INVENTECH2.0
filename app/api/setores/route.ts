import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    await exigeLogin();

    const setores = await prisma.setores.findMany({
      orderBy: {
        nome: "asc",
      },
      select: {
        id: true,
        nome: true,
      },
    });

    return NextResponse.json(setores);
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao buscar setores:", error);

    const detalhe =
      error instanceof Error ? error.message : "Erro desconhecido.";

    return NextResponse.json(
      {
        erro: "Erro ao buscar setores.",
        detalhe,
      },
      { status: 500 }
    );
  }
}