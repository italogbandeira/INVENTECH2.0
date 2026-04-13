import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";
import { criarLogAuditoria } from "@/lib/auditoria";

/**
 * Snapshot enxuto da máquina usado nos logs de auditoria.
 */
function snapshotMaquina(maquina: {
  id: number;
  numero_serie: string;
  setor_id: number;
  usuario_id: number | null;
  tipo_equipamento_id: number | null;
  modelo_id: number | null;
  contrato_id: number | null;
  origem_id: number | null;
  observacoes: string | null;
  esset: string | null;
  termo_responsabilidade: string | null;
  numero_termo_responsabilidade: string | null;
}) {
  return {
    id: maquina.id,
    numero_serie: maquina.numero_serie,
    setor_id: maquina.setor_id,
    usuario_id: maquina.usuario_id,
    tipo_equipamento_id: maquina.tipo_equipamento_id,
    modelo_id: maquina.modelo_id,
    contrato_id: maquina.contrato_id,
    origem_id: maquina.origem_id,
    observacoes: maquina.observacoes,
    esset: maquina.esset,
    termo_responsabilidade: maquina.termo_responsabilidade,
    numero_termo_responsabilidade: maquina.numero_termo_responsabilidade,
  };
}

/**
 * Extrai dados mínimos do autor da ação para auditoria.
 */
function autorAuditoria(logado: {
  id: number;
  nome: string;
  email: string;
  perfil: string;
}) {
  return {
    id: logado.id,
    nome: logado.nome,
    email: logado.email,
  };
}

/**
 * POST /api/maquinas/excluir-selecionadas
 *
 * Responsabilidades:
 * - exigir autenticação
 * - validar confirmação textual
 * - validar IDs recebidos
 * - excluir várias máquinas
 * - registrar auditoria individual por máquina
 */
export async function POST(req: Request) {
  try {
    const logado = await exigeLogin();
    const body = await req.json();

    const ids = Array.isArray(body?.ids)
      ? body.ids
          .map((item: unknown) => Number(item))
          .filter((id: number) => !Number.isNaN(id))
      : [];

    const confirmacao = String(body?.confirmacao ?? "").trim();

    if (confirmacao !== "DELETAR") {
      return NextResponse.json(
        { erro: 'Confirmação inválida. Digite "DELETAR".' },
        { status: 400 }
      );
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { erro: "Selecione pelo menos uma máquina." },
        { status: 400 }
      );
    }

    const maquinas = await prisma.maquinas.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    if (maquinas.length === 0) {
      return NextResponse.json(
        { erro: "Nenhuma máquina encontrada para exclusão." },
        { status: 404 }
      );
    }

    /**
     * Exclui uma por uma para conseguir auditar cada item individualmente.
     */
    for (const maquina of maquinas) {
      const antes = snapshotMaquina(maquina);

      await prisma.maquinas.delete({
        where: { id: maquina.id },
      });

      await criarLogAuditoria({
        entidade: "maquina",
        entidadeId: maquina.id,
        acao: "exclusao_em_lote",
        funcionario: autorAuditoria(logado),
        descricao: `Excluiu em lote a máquina ${maquina.numero_serie}`,
        antes,
        depois: null,
      });
    }

    return NextResponse.json({
      sucesso: true,
      totalExcluidas: maquinas.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao excluir máquinas selecionadas:", error);
    return NextResponse.json(
      { erro: "Erro interno ao excluir máquinas selecionadas." },
      { status: 500 }
    );
  }
}