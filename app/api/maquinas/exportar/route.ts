import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";

/**
 * Estrutura da linha exportada para Excel.
 *
 * Já vem com os nomes amigáveis resultantes dos JOINs.
 */
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

/**
 * POST /api/maquinas/exportar
 *
 * Responsabilidades:
 * - exigir autenticação
 * - receber filtros da tela
 * - exportar:
 *   - apenas máquinas selecionadas
 *   - ou tudo que bate no filtro
 * - gerar arquivo Excel em memória
 * - devolver o arquivo como download
 */
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
          .filter((id: number) => !Number.isNaN(id))
      : [];

    /**
     * Se não for exportação total filtrada,
     * então deve haver pelo menos uma máquina marcada.
     */
    if (!exportarTudoFiltrado && idsSelecionados.length === 0) {
      return NextResponse.json(
        { erro: "Nenhuma máquina selecionada para exportação." },
        { status: 400 }
      );
    }

    /**
     * Montagem dinâmica dos filtros SQL.
     */
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

    if (tiposEquipamento.length > 0) {
      const placeholders = tiposEquipamento.map(() => "?").join(", ");
      conditions.push(`t.nome IN (${placeholders})`);
      values.push(...tiposEquipamento);
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

    /**
     * Quando não é "tudo filtrado", restringe pelos IDs selecionados.
     */
    if (!exportarTudoFiltrado) {
      const placeholders = idsSelecionados.map(() => "?").join(", ");
      conditions.push(`m.id IN (${placeholders})`);
      values.push(...idsSelecionados);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    /**
     * Consulta SQL com JOINs para gerar a planilha já amigável.
     */
    const maquinas = await prisma.$queryRawUnsafe<LinhaMaquina[]>(
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
      FROM maquinas m
      LEFT JOIN setores s ON s.id = m.setor_id
      LEFT JOIN usuarios u ON u.id = m.usuario_id
      LEFT JOIN tipos_equipamento t ON t.id = m.tipo_equipamento_id
      LEFT JOIN modelos mo ON mo.id = m.modelo_id
      LEFT JOIN contratos c ON c.id = m.contrato_id
      LEFT JOIN origens o ON o.id = m.origem_id
      ${whereClause}
      ORDER BY m.id ASC
      `,
      ...values
    );

    /**
     * Cria workbook e worksheet em memória.
     */
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Máquinas");

    /**
     * Define colunas, cabeçalhos e larguras.
     */
    sheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Número de Série", key: "numero_serie", width: 24 },
      { header: "Setor", key: "setor", width: 20 },
      { header: "Usuário", key: "usuario", width: 24 },
      { header: "Tipo", key: "tipo_equipamento", width: 20 },
      { header: "Modelo", key: "modelo", width: 24 },
      { header: "Contrato", key: "contrato", width: 20 },
      { header: "Origem", key: "origem", width: 20 },
      { header: "ESSET", key: "esset", width: 16 },
      { header: "Observações", key: "observacoes", width: 30 },
      {
        header: "Termo de Responsabilidade",
        key: "termo_responsabilidade",
        width: 24,
      },
      {
        header: "Número do Termo",
        key: "numero_termo_responsabilidade",
        width: 24,
      },
    ];

    sheet.getRow(1).font = { bold: true };

    /**
     * Preenche as linhas da planilha.
     */
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

    return NextResponse.json(
      { erro: "Erro interno ao exportar Excel." },
      { status: 500 }
    );
  }
}