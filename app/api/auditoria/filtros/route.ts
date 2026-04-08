import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeMaster } from "@/lib/auth";

export async function GET() {
  try {
    await exigeMaster();

    const [funcionariosRaw, acoesRaw, entidadesRaw] = await Promise.all([
      prisma.auditoriaLog.findMany({
        where: {
          funcionarioNome: {
            not: null,
          },
        },
        select: {
          funcionarioNome: true,
        },
        distinct: ["funcionarioNome"],
        orderBy: {
          funcionarioNome: "asc",
        },
      }),

      prisma.auditoriaLog.findMany({
        select: {
          acao: true,
        },
        distinct: ["acao"],
        orderBy: {
          acao: "asc",
        },
      }),

      prisma.auditoriaLog.findMany({
        select: {
          entidade: true,
        },
        distinct: ["entidade"],
        orderBy: {
          entidade: "asc",
        },
      }),
    ]);

    const funcionarios = funcionariosRaw
      .map((item) => item.funcionarioNome)
      .filter((value): value is string => Boolean(value));

    const acoes = acoesRaw.map((item) => item.acao).filter(Boolean);
    const entidades = entidadesRaw.map((item) => item.entidade).filter(Boolean);

    return NextResponse.json({
      funcionarios,
      acoes,
      entidades,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SEM_PERMISSAO") {
      return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao buscar filtros da auditoria:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar filtros da auditoria." },
      { status: 500 }
    );
  }
}