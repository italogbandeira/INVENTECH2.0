import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

type MaquinaDetalhada = {
  id: number;
  numero_serie: string;
  setor: string | null;
  usuario: string | null;
  tipo_equipamento: string | null;
  modelo: string | null;
  contrato: string | null;
  origem: string | null;
  observacoes: string | null;
  esset: string | null;
  termo_responsabilidade: string | null;
  numero_termo_responsabilidade: string | null;
};

type ResultadoPaginado = {
  dados: MaquinaDetalhada[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const numeroSerie = searchParams.get("numero_serie")?.trim() ?? "";
    const setor = searchParams.get("setor")?.trim() ?? "";
    const usuario = searchParams.get("usuario")?.trim() ?? "";
    const tipoEquipamento = searchParams.get("tipo_equipamento")?.trim() ?? "";
    const modelo = searchParams.get("modelo")?.trim() ?? "";
    const contrato = searchParams.get("contrato")?.trim() ?? "";
    const origem = searchParams.get("origem")?.trim() ?? "";

    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");
    const offset = (page - 1) * limit;

    let whereClause = `
      WHERE 1=1
    `;

    const params: string[] = [];

    if (numeroSerie) {
      whereClause += ` AND m.numero_serie LIKE ?`;
      params.push(`%${numeroSerie}%`);
    }

    if (setor) {
      whereClause += ` AND s.nome = ?`;
      params.push(setor);
    }

    if (usuario) {
      whereClause += ` AND u.nome = ?`;
      params.push(usuario);
    }

    if (tipoEquipamento) {
      whereClause += ` AND te.nome = ?`;
      params.push(tipoEquipamento);
    }

    if (modelo) {
      whereClause += ` AND mo.nome = ?`;
      params.push(modelo);
    }

    if (contrato) {
      whereClause += ` AND c.nome = ?`;
      params.push(contrato);
    }

    if (origem) {
      whereClause += ` AND o.nome = ?`;
      params.push(origem);
    }

    const queryBase = `
      FROM maquinas m
      LEFT JOIN setores s ON m.setor_id = s.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      LEFT JOIN tipos_equipamento te ON m.tipo_equipamento_id = te.id
      LEFT JOIN modelos mo ON m.modelo_id = mo.id
      LEFT JOIN contratos c ON m.contrato_id = c.id
      LEFT JOIN origens o ON m.origem_id = o.id
      ${whereClause}
    `;

    const totalResult = await prisma.$queryRawUnsafe<{ total: number }[]>(
      `
      SELECT COUNT(*) as total
      ${queryBase}
      `,
      ...params
    );

    const total = Number(totalResult[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limit);

    const dados = await prisma.$queryRawUnsafe<MaquinaDetalhada[]>(
      `
      SELECT
        m.id,
        m.numero_serie,
        s.nome AS setor,
        u.nome AS usuario,
        te.nome AS tipo_equipamento,
        mo.nome AS modelo,
        c.nome AS contrato,
        o.nome AS origem,
        m.observacoes,
        m.esset,
        m.termo_responsabilidade,
        m.numero_termo_responsabilidade
      ${queryBase}
      ORDER BY m.id DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      ...params
    );

    const resultado: ResultadoPaginado = {
      dados,
      total,
      page,
      limit,
      totalPages,
    };

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao buscar máquinas detalhadas:", error);

    return NextResponse.json(
      { error: "Erro ao buscar máquinas detalhadas" },
      { status: 500 }
    );
  }
}