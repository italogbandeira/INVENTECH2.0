import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

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

    await prisma.maquinas.delete({
      where: { id: maquinaId },
    });

    return NextResponse.json({ message: "Máquina excluída com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir máquina:", error);
    return NextResponse.json(
      { error: "Erro ao excluir máquina." },
      { status: 500 }
    );
  }
}


export async function PUT(request: NextRequest, { params }: Params) {
  try {
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

    return NextResponse.json(maquinaAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar máquina:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar máquina." },
      { status: 500 }
    );
  }
}
