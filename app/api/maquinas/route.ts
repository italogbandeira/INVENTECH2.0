import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

type NovaMaquinaBody = {
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

export async function GET() {
  try {
    const maquinas = await prisma.maquinas.findMany({
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json(maquinas);
  } catch (error) {
    console.error("Erro ao buscar máquinas:", error);

    return NextResponse.json(
      { error: "Erro ao buscar máquinas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NovaMaquinaBody;

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

    const existente = await prisma.maquinas.findFirst({
      where: {
        numero_serie: numeroSerie,
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Já existe uma máquina com esse número de série." },
        { status: 400 }
      );
    }

    const maquina = await prisma.maquinas.create({
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

    return NextResponse.json(maquina, { status: 201 });
  } catch (error) {
    console.error("Erro ao cadastrar máquina:", error);

    return NextResponse.json(
      { error: "Erro ao cadastrar máquina." },
      { status: 500 }
    );
  }
}