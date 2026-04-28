import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeMaster } from "@/lib/auth";

export const runtime = "nodejs";

type FiltrosAuditoria = {
  funcionario?: string;
  entidade?: string;
  acao?: string;
  registro?: string;
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
};

type BodyLimparAuditoria = {
  modo: "selecionados" | "filtro";
  ids?: number[];
  filtros?: FiltrosAuditoria;
  confirmacao?: string;
};

function texto(valor: unknown): string {
  return String(valor ?? "").trim();
}

function filtroAtivo(valor: unknown): string {
  const limpo = texto(valor);

  if (!limpo) return "";

  const lower = limpo.toLowerCase();

  if (lower === "todos" || lower === "todas") {
    return "";
  }

  return limpo;
}

function montarWhere(filtros: FiltrosAuditoria) {
  const funcionario = filtroAtivo(filtros.funcionario);
  const entidade = filtroAtivo(filtros.entidade);
  const acao = filtroAtivo(filtros.acao);
  const registro = filtroAtivo(filtros.registro);
  const busca = filtroAtivo(filtros.busca);
  const dataInicio = filtroAtivo(filtros.dataInicio);
  const dataFim = filtroAtivo(filtros.dataFim);

  const where: any = {
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

    ...(dataInicio || dataFim
      ? {
          createdAt: {
            ...(dataInicio
              ? { gte: new Date(`${dataInicio}T00:00:00`) }
              : {}),
            ...(dataFim ? { lte: new Date(`${dataFim}T23:59:59`) } : {}),
          },
        }
      : {}),

    ...(busca
      ? {
          OR: [
            {
              descricao: {
                contains: busca,
              },
            },
            {
              antes: {
                contains: busca,
              },
            },
            {
              depois: {
                contains: busca,
              },
            },
            {
              funcionarioNome: {
                contains: busca,
              },
            },
            {
              entidade: {
                contains: busca,
              },
            },
            {
              acao: {
                contains: busca,
              },
            },
          ],
        }
      : {}),
  };

  return where;
}

function tratarErro(error: unknown) {
  if (error instanceof Error && error.message === "SEM_PERMISSAO") {
    return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  }

  if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    await exigeMaster();

    const { searchParams } = new URL(req.url);

    const filtros: FiltrosAuditoria = {
      funcionario: searchParams.get("funcionario")?.trim(),
      entidade: searchParams.get("entidade")?.trim(),
      acao: searchParams.get("acao")?.trim(),
      registro: searchParams.get("registro")?.trim(),
      busca: searchParams.get("busca")?.trim(),
      dataInicio: searchParams.get("dataInicio")?.trim(),
      dataFim: searchParams.get("dataFim")?.trim(),
    };

    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get("limit") ?? "20"))
    );

    const skip = (page - 1) * limit;

    const where = montarWhere(filtros);

    const [total, logs] = await Promise.all([
      prisma.auditoriaLog.count({ where }),
      prisma.auditoriaLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      logs,
      total,
      totalPages,
      page,
      limit,
    });
  } catch (error) {
    const respostaErro = tratarErro(error);

    if (respostaErro) {
      return respostaErro;
    }

    console.error("Erro ao buscar auditoria:", error);

    return NextResponse.json(
      { erro: "Erro ao buscar auditoria." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await exigeMaster();

    const body = (await req.json()) as BodyLimparAuditoria;

    const confirmacao = String(body.confirmacao ?? "").trim().toLowerCase();

if (confirmacao !== "deletar") {
  return NextResponse.json(
    {
      erro: 'Para limpar a auditoria, é necessário digitar "deletar".',
    },
    { status: 400 }
  );
}
    if (body.modo === "selecionados") {
      const ids = Array.isArray(body.ids)
        ? body.ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
        : [];

      if (ids.length === 0) {
        return NextResponse.json(
          {
            erro: "Nenhum registro de auditoria foi selecionado.",
          },
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
      const where = montarWhere(body.filtros ?? {});

      const totalEncontrado = await prisma.auditoriaLog.count({ where });

      if (totalEncontrado === 0) {
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
      {
        erro: "Modo de limpeza inválido.",
      },
      { status: 400 }
    );
  } catch (error) {
    const respostaErro = tratarErro(error);

    if (respostaErro) {
      return respostaErro;
    }

    console.error("Erro ao limpar auditoria:", error);

    const detalhe =
      error instanceof Error ? error.message : "Erro desconhecido.";

    return NextResponse.json(
      {
        erro: "Erro ao limpar auditoria.",
        detalhe,
      },
      { status: 500 }
    );
  }
}