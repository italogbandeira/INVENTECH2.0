import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeMaster } from "@/lib/auth";

export const runtime = "nodejs";

type FuncionarioSessao = {
  id?: number;
  nome?: string;
  email?: string;
  perfil?: string;
};

export async function POST(req: Request) {
  try {
    const funcionario = (await exigeMaster()) as FuncionarioSessao | undefined;

    const body = await req.json().catch(() => null);

    const confirmacao = String(body?.confirmacao ?? "")
      .trim()
      .toLowerCase();

    if (confirmacao !== "deletar") {
      return NextResponse.json(
        {
          erro: 'Para apagar todas as máquinas, é necessário digitar "deletar".',
        },
        { status: 400 }
      );
    }

    const totalAntes = await prisma.maquinas.count();

    if (totalAntes === 0) {
      return NextResponse.json({
        mensagem: "Nenhuma máquina encontrada para apagar.",
        removidas: 0,
      });
    }

    const resultado = await prisma.maquinas.deleteMany({});

    await prisma.auditoriaLog.create({
      data: {
        entidade: "maquina",
        entidadeId: null,
        acao: "exclusao_total",
        funcionarioId: funcionario?.id ?? null,
        funcionarioNome: funcionario?.nome ?? "Master",
        descricao: `Excluiu todas as máquinas do inventário. Total removido: ${resultado.count}.`,
        antes: JSON.stringify({
          totalMaquinasAntes: totalAntes,
        }),
        depois: JSON.stringify({
          totalMaquinasDepois: 0,
        }),
      },
    });

    return NextResponse.json({
      mensagem: "Todas as máquinas foram apagadas com sucesso.",
      removidas: resultado.count,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SEM_PERMISSAO") {
      return NextResponse.json(
        { erro: "Apenas usuários master podem apagar todas as máquinas." },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao apagar todas as máquinas:", error);

    const detalhe =
      error instanceof Error ? error.message : "Erro desconhecido.";

    return NextResponse.json(
      {
        erro: "Erro interno ao apagar todas as máquinas.",
        detalhe,
      },
      { status: 500 }
    );
  }
}