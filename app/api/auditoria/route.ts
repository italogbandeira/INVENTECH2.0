import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeMaster } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await exigeMaster();

    const { searchParams } = new URL(req.url);

    const funcionario = searchParams.get("funcionario")?.trim();
    const entidade = searchParams.get("entidade")?.trim();
    const acao = searchParams.get("acao")?.trim();
    const registro = searchParams.get("registro")?.trim();
    const dataInicio = searchParams.get("dataInicio")?.trim();
    const dataFim = searchParams.get("dataFim")?.trim();

    const where = {
      ...(funcionario
        ? {
            funcionarioNome: {
              contains: funcionario,
            },
          }
        : {}),
      ...(entidade ? { entidade } : {}),
      ...(acao ? { acao } : {}),
      ...(registro && !Number.isNaN(Number(registro))
        ? { entidadeId: Number(registro) }
        : {}),
      ...((dataInicio || dataFim)
        ? {
            createdAt: {
              ...(dataInicio
                ? { gte: new Date(`${dataInicio}T00:00:00`) }
                : {}),
              ...(dataFim
                ? { lte: new Date(`${dataFim}T23:59:59`) }
                : {}),
            },
          }
        : {}),
    };

    const logs = await prisma.auditoriaLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 300,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    if (error instanceof Error && error.message === "SEM_PERMISSAO") {
      return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao buscar auditoria:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar auditoria." },
      { status: 500 }
    );
  }
}