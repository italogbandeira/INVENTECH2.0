import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";

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

export async function GET(req: Request) {
  try {
    await exigeLogin();

    const { searchParams } = new URL(req.url);

    const numeroSerie = searchParams.get("numero_serie")?.trim() ?? "";
    const setores = searchParams.getAll("setor").map((v) => v.trim()).filter(Boolean);
    const usuarios = searchParams.getAll("usuario").map((v) => v.trim()).filter(Boolean);
    const tipos = searchParams
      .getAll("tipo_equipamento")
      .map((v) => v.trim())
      .filter(Boolean);
    const modelos = searchParams.getAll("modelo").map((v) => v.trim()).filter(Boolean);
    const contratos = searchParams
      .getAll("contrato")
      .map((v) => v.trim())
      .filter(Boolean);
    const origens = searchParams.getAll("origem").map((v) => v.trim()).filter(Boolean);

    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (numeroSerie) {
      conditions.push("m.numero_serie LIKE ?");
      values.push(`%${numeroSerie}%`);
    }

    if (setores.length > 0) {
      const placeholders = setores.map(() => "?").join(", ");
      conditions.push(`s.nome IN (${placeholders})`);
      values.push(...setores);
    }

    if (usuarios.length > 0) {
      const placeholders = usuarios.map(() => "?").join(", ");
      conditions.push(`u.nome IN (${placeholders})`);
      values.push(...usuarios);
    }

    if (tipos.length > 0) {
      const placeholders = tipos.map(() => "?").join(", ");
      conditions.push(`t.nome IN (${placeholders})`);
      values.push(...tipos);
    }

    if (modelos.length > 0) {
      const placeholders = modelos.map(() => "?").join(", ");
      conditions.push(`mo.nome IN (${placeholders})`);
      values.push(...modelos);
    }

    if (contratos.length > 0) {
      const placeholders = contratos.map(() => "?").join(", ");
      conditions.push(`c.nome IN (${placeholders})`);
      values.push(...contratos);
    }

    if (origens.length > 0) {
      const placeholders = origens.map(() => "?").join(", ");
      conditions.push(`o.nome IN (${placeholders})`);
      values.push(...origens);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const queryBase = `
      FROM maquinas m
      LEFT JOIN setores s ON s.id = m.setor_id
      LEFT JOIN usuarios u ON u.id = m.usuario_id
      LEFT JOIN tipos_equipamento t ON t.id = m.tipo_equipamento_id
      LEFT JOIN modelos mo ON mo.id = m.modelo_id
      LEFT JOIN contratos c ON c.id = m.contrato_id
      LEFT JOIN origens o ON o.id = m.origem_id
      ${whereClause}
    `;

    const totalResult = await prisma.$queryRawUnsafe<{ total: number }[]>(
      `
      SELECT COUNT(*) as total
      ${queryBase}
      `,
      ...values
    );

    const dados = await prisma.$queryRawUnsafe<MaquinaDetalhada[]>(
      `
      SELECT
        m.id,
        m.numero_serie,
        s.nome AS setor,
        u.nome AS usuario,
        t.nome AS tipo_equipamento,
        mo.nome AS modelo,
        c.nome AS contrato,
        o.nome AS origem,
        m.observacoes,
        m.esset,
        m.termo_responsabilidade,
        m.numero_termo_responsabilidade
      ${queryBase}
      ORDER BY m.id DESC
      LIMIT ? OFFSET ?
      `,
      ...values,
      limit,
      offset
    );

    const total = Number(totalResult?.[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      dados,
      total,
      totalPages,
      page,
      limit,
    });
  } catch (error) {
    console.error("Erro ao buscar máquinas detalhadas:", error);

    return NextResponse.json(
      { erro: "Erro interno ao buscar máquinas detalhadas." },
      { status: 500 }
    );
  }
}