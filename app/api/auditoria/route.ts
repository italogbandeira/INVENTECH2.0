import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeMaster } from "@/lib/auth";

export async function GET() {
  try {
    await exigeMaster();

    const logs = await prisma.auditoriaLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return NextResponse.json(logs);
  } catch (error) {
    if (error instanceof Error && error.message === "SEM_PERMISSAO") {
      return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error(error);
    return NextResponse.json(
      { erro: "Erro ao buscar auditoria." },
      { status: 500 }
    );
  }
}