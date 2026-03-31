import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";
import { criarLogAuditoria } from "@/lib/auditoria";

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

export async function GET() {
  try {
    const maquinas = await prisma.maquinas.findMany({
      orderBy: { id: "desc" },
    });

    return NextResponse.json(maquinas);
  } catch (error) {
    console.error("Erro ao buscar máquinas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar máquinas." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const logado = await exigeLogin();
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
      where: { numero_serie: numeroSerie },
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

    await criarLogAuditoria({
      entidade: "maquina",
      entidadeId: maquina.id,
      acao: "criacao",
      funcionario: autorAuditoria(logado),
      descricao: `Criou a máquina ${maquina.numero_serie}`,
      antes: null,
      depois: snapshotMaquina(maquina),
    });

    return NextResponse.json(maquina, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao cadastrar máquina:", error);
    return NextResponse.json(
      { error: "Erro ao cadastrar máquina." },
      { status: 500 }
    );
  }
}