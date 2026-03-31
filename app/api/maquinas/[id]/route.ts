import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";
import { criarLogAuditoria } from "@/lib/auditoria";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type AtualizarMaquinaBody = {
  numero_serie: string;
  setor_id: number;
  usuario_id?: number | null;
  tipo_equipamento_id?: number | null;
  modelo_id?: number | null;
  contrato_id?: number | null;
  origem_id?: number | null;
  observacoes?: string | null;
  esset?: string | null;
  termo_responsabilidade?: string | null;
  numero_termo_responsabilidade?: string | null;
};

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

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const maquinaId = Number(id);

    const maquina = await prisma.maquinas.findUnique({
      where: { id: maquinaId },
    });

    if (!maquina) {
      return NextResponse.json(
        { error: "Máquina não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json(maquina);
  } catch (error) {
    console.error("Erro ao buscar máquina:", error);
    return NextResponse.json(
      { error: "Erro ao buscar máquina." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const logado = await exigeLogin();
    const { id } = await params;
    const maquinaId = Number(id);

    const maquinaExistente = await prisma.maquinas.findUnique({
      where: { id: maquinaId },
    });

    if (!maquinaExistente) {
      return NextResponse.json(
        { error: "Máquina não encontrada." },
        { status: 404 }
      );
    }

    const antes = snapshotMaquina(maquinaExistente);

    await prisma.maquinas.delete({
      where: { id: maquinaId },
    });

    await criarLogAuditoria({
      entidade: "maquina",
      entidadeId: maquinaId,
      acao: "exclusao",
      funcionario: autorAuditoria(logado),
      descricao: `Excluiu a máquina ${maquinaExistente.numero_serie}`,
      antes,
      depois: null,
    });

    return NextResponse.json({ message: "Máquina excluída com sucesso." });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao excluir máquina:", error);
    return NextResponse.json(
      { error: "Erro ao excluir máquina." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const logado = await exigeLogin();
    const { id } = await params;
    const maquinaId = Number(id);
    const body = (await request.json()) as AtualizarMaquinaBody;

    const numeroSerie = body.numero_serie?.trim();

    if (!numeroSerie) {
      return NextResponse.json(
        { error: "Número de série é obrigatório." },
        { status: 400 }
      );
    }

    if (!body.setor_id) {
      return NextResponse.json(
        { error: "Setor é obrigatório." },
        { status: 400 }
      );
    }

    const maquinaExistente = await prisma.maquinas.findUnique({
      where: { id: maquinaId },
    });

    if (!maquinaExistente) {
      return NextResponse.json(
        { error: "Máquina não encontrada." },
        { status: 404 }
      );
    }

    const duplicada = await prisma.maquinas.findFirst({
      where: {
        numero_serie: numeroSerie,
      },
    });

    if (duplicada && duplicada.id !== maquinaId) {
      return NextResponse.json(
        { error: "Já existe outra máquina com esse número de série." },
        { status: 400 }
      );
    }

    const antes = snapshotMaquina(maquinaExistente);

    const maquinaAtualizada = await prisma.maquinas.update({
      where: { id: maquinaId },
      data: {
        numero_serie: numeroSerie,
        setor_id: body.setor_id,
        usuario_id: body.usuario_id ?? null,
        tipo_equipamento_id: body.tipo_equipamento_id ?? null,
        modelo_id: body.modelo_id ?? null,
        contrato_id: body.contrato_id ?? null,
        origem_id: body.origem_id ?? null,
        observacoes: body.observacoes ?? null,
        esset: body.esset ?? null,
        termo_responsabilidade: body.termo_responsabilidade ?? null,
        numero_termo_responsabilidade:
          body.numero_termo_responsabilidade ?? null,
      },
    });

    await criarLogAuditoria({
      entidade: "maquina",
      entidadeId: maquinaId,
      acao: "edicao",
      funcionario: autorAuditoria(logado),
      descricao: `Editou a máquina ${maquinaAtualizada.numero_serie}`,
      antes,
      depois: snapshotMaquina(maquinaAtualizada),
    });

    return NextResponse.json(maquinaAtualizada);
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao atualizar máquina:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar máquina." },
      { status: 500 }
    );
  }
}