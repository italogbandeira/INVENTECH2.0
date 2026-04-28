export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";

type FiltrosAuditoria = {
  funcionarioId?: string;
  entidade?: string;
  acao?: string;
  entidadeId?: string;
  busca?: string;
  dataInicial?: string;
  dataFinal?: string;
};

type BodyLimparAuditoria = {
  modo: "selecionados" | "filtro";
  ids?: number[];
  filtros?: FiltrosAuditoria;
};

function valorTexto(valor: unknown): string {
  return String(valor ?? "").trim();
}

function montarWhere(filtros?: FiltrosAuditoria) {
  const where: any = {};
  const and: any[] = [];

  const funcionarioId = valorTexto(filtros?.funcionarioId);
  const entidade = valorTexto(filtros?.entidade);
  const acao = valorTexto(filtros?.acao);
  const entidadeId = valorTexto(filtros?.entidadeId);
  const busca = valorTexto(filtros?.busca);
  const dataInicial = valorTexto(filtros?.dataInicial);
  const dataFinal = valorTexto(filtros?.dataFinal);

  if (funcionarioId && funcionarioId !== "todos") {
    where.funcionarioId = Number(funcionarioId);
  }

  if (entidade && entidade !== "todas") {
    where.entidade = entidade;
  }

  if (acao && acao !== "todas") {
    where.acao = acao;
  }

  if (entidadeId) {
    const id = Number(entidadeId);

    if (Number.isInteger(id)) {
      where.entidadeId = id;
    }
  }

  if (dataInicial || dataFinal) {
    where.createdAt = {};

    if (dataInicial) {
      where.createdAt.gte = new Date(`${dataInicial}T00:00:00.000`);
    }

    if (dataFinal) {
      where.createdAt.lte = new Date(`${dataFinal}T23:59:59.999`);
    }
  }

  if (busca) {
    and.push({
      OR: [
        { funcionarioNome: { contains: busca, mode: "insensitive" } },
        { descricao: { contains: busca, mode: "insensitive" } },
        { antes: { contains: busca, mode: "insensitive" } },
        { depois: { contains: busca, mode: "insensitive" } },
        { entidade: { contains: busca, mode: "insensitive" } },
        { acao: { contains: busca, mode: "insensitive" } },
      ],
    });
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
}

export async function POST(req: Request) {
  try {
    const funcionario = await exigeLogin();

    if (funcionario.perfil !== "master") {
      return NextResponse.json(
        { erro: "Apenas usuários master podem limpar auditoria." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as BodyLimparAuditoria;

    if (body.modo === "selecionados") {
      const ids = Array.isArray(body.ids)
        ? body.ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
        : [];

      if (ids.length === 0) {
        return NextResponse.json(
          { erro: "Nenhum registro de auditoria foi selecionado." },
          { status: 400 }
        );
      }

      const resultado = await prisma.auditoriaLog.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      return NextResponse.json({
        mensagem: "Registros selecionados removidos da auditoria.",
        removidos: resultado.count,
      });
    }

    if (body.modo === "filtro") {
      const where = montarWhere(body.filtros);

      const total = await prisma.auditoriaLog.count({ where });

      if (total === 0) {
        return NextResponse.json({
          mensagem: "Nenhum registro encontrado para limpar.",
          removidos: 0,
        });
      }

      const resultado = await prisma.auditoriaLog.deleteMany({ where });

      return NextResponse.json({
        mensagem: "Registros filtrados removidos da auditoria.",
        removidos: resultado.count,
      });
    }

    return NextResponse.json(
      { erro: "Modo de limpeza inválido." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro ao limpar auditoria:", error);

    const detalhe =
      error instanceof Error ? error.message : "Erro desconhecido.";

    return NextResponse.json(
      {
        erro: "Erro interno ao limpar auditoria.",
        detalhe,
      },
      { status: 500 }
    );
  }
}