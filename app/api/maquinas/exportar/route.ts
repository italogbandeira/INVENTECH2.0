export const runtime = "nodejs";

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";

type LinhaMaquina = {
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

function criarPlaceholdersPostgres(
  valores: (string | number)[],
  novosValores: (string | number)[]
) {
  const placeholders = novosValores.map((valor) => {
    valores.push(valor);
    return `$${valores.length}`;
  });

  return placeholders.join(", ");
}

export async function POST(req: Request) {
  try {
    await exigeLogin();

    const body = await req.json();

    const numeroSerie = String(body?.numeroSerie ?? "").trim();

    const setores = Array.isArray(body?.setores) ? body.setores : [];
    const usuarios = Array.isArray(body?.usuarios) ? body.usuarios : [];
    const tiposEquipamento = Array.isArray(body?.tiposEquipamento)
      ? body.tiposEquipamento
      : [];
    const modelos = Array.isArray(body?.modelos) ? body.modelos : [];
    const contratos = Array.isArray(body?.contratos) ? body.contratos : [];
    const origens = Array.isArray(body?.origens) ? body.origens : [];

    const exportarTudoFiltrado = Boolean(body?.exportarTudoFiltrado);

    const idsSelecionados = Array.isArray(body?.idsSelecionados)
      ? body.idsSelecionados
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isFinite(id))
      : [];

    if (!exportarTudoFiltrado && idsSelecionados.length === 0) {
      return NextResponse.json(
        { erro: "Nenhuma máquina selecionada para exportação." },
        { status: 400 }
      );
    }

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (numeroSerie) {
      values.push(`%${numeroSerie}%`);
      conditions.push(`m.numero_serie ILIKE $${values.length}`);
    }

    if (setores.length > 0) {
      const placeholders = criarPlaceholdersPostgres(values, setores);
      conditions.push(`s.nome IN (${placeholders})`);
    }

    if (usuarios.length > 0) {
      const placeholders = criarPlaceholdersPostgres(values, usuarios);
      conditions.push(`u.nome IN (${placeholders})`);
    }

    if (tiposEquipamento.length > 0) {
      const placeholders = criarPlaceholdersPostgres(values, tiposEquipamento);
      conditions.push(`t.nome IN (${placeholders})`);
    }

    if (modelos.length > 0) {
      const placeholders = criarPlaceholdersPostgres(values, modelos);
      conditions.push(`mo.nome IN (${placeholders})`);
    }

    if (contratos.length > 0) {
      const placeholders = criarPlaceholdersPostgres(values, contratos);
      conditions.push(`c.nome IN (${placeholders})`);
    }

    if (origens.length > 0) {
      const placeholders = criarPlaceholdersPostgres(values, origens);
      conditions.push(`o.nome IN (${placeholders})`);
    }

    if (!exportarTudoFiltrado) {
      const placeholders = criarPlaceholdersPostgres(values, idsSelecionados);
      conditions.push(`m.id IN (${placeholders})`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
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
      FROM maquinas m
      LEFT JOIN setores s ON s.id = m.setor_id
      LEFT JOIN usuarios u ON u.id = m.usuario_id
      LEFT JOIN tipos_equipamento t ON t.id = m.tipo_equipamento_id
      LEFT JOIN modelos mo ON mo.id = m.modelo_id
      LEFT JOIN contratos c ON c.id = m.contrato_id
      LEFT JOIN origens o ON o.id = m.origem_id
      ${whereClause}
      ORDER BY m.id ASC
    `;

    const maquinas = await prisma.$queryRawUnsafe<LinhaMaquina[]>(
      query,
      ...values
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Máquinas");

    sheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Número de Série", key: "numero_serie", width: 24 },
      { header: "Setor", key: "setor", width: 24 },
      { header: "Usuário", key: "usuario", width: 28 },
      { header: "Tipo", key: "tipo_equipamento", width: 20 },
      { header: "Modelo", key: "modelo", width: 24 },
      { header: "Contrato", key: "contrato", width: 20 },
      { header: "Origem", key: "origem", width: 20 },
      { header: "ESSET", key: "esset", width: 16 },
      { header: "Observações", key: "observacoes", width: 40 },
      {
        header: "Termo de Responsabilidade",
        key: "termo_responsabilidade",
        width: 28,
      },
      {
        header: "Número do Termo",
        key: "numero_termo_responsabilidade",
        width: 28,
      },
    ];

    sheet.getRow(1).font = { bold: true };

    maquinas.forEach((maquina) => {
      sheet.addRow({
        id: maquina.id,
        numero_serie: maquina.numero_serie ?? "",
        setor: maquina.setor ?? "",
        usuario: maquina.usuario ?? "",
        tipo_equipamento: maquina.tipo_equipamento ?? "",
        modelo: maquina.modelo ?? "",
        contrato: maquina.contrato ?? "",
        origem: maquina.origem ?? "",
        esset: maquina.esset ?? "",
        observacoes: maquina.observacoes ?? "",
        termo_responsabilidade: maquina.termo_responsabilidade ?? "",
        numero_termo_responsabilidade:
          maquina.numero_termo_responsabilidade ?? "",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="maquinas-filtradas.xlsx"',
      },
    });
  } catch (error) {
    console.error("Erro ao exportar Excel:", error);

    const mensagem =
      error instanceof Error
        ? error.message
        : "Erro desconhecido ao exportar Excel.";

    return NextResponse.json(
      {
        erro: "Erro interno ao exportar Excel.",
        detalhe: mensagem,
      },
      { status: 500 }
    );
  }
}