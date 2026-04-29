import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  PDFDocument,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";

/**
 * Parâmetros dinâmicos esperados pela rota.
 */
type ContextoParams = {
  params: Promise<{ id: string }>;
};

/**
 * Estrutura mínima da máquina usada na geração do termo.
 */
type MaquinaParaTermo = {
  id: number;
  numero_serie: string;
  tipo: string;
  modelo: string;
  setor: string;
};

/**
 * Meses em português para a data por extenso.
 */

/**
 * =========================
 * CONSTANTES DE POSICIONAMENTO
 * =========================
 *
 * Se algo sair desalinhado no PDF, ajuste estes valores.
 *
 * Regras:
 * - aumentar X => vai para a direita
 * - diminuir X => vai para a esquerda
 * - aumentar Y => sobe
 * - diminuir Y => desce
 */

/**
 * Campos superiores do termo.
 */
const POS_NOME = { x: 100, y: 701 };
const POS_CPF = { x: 454, y: 582 };
const POS_SETOR = { x: 180, y: 689 };

/**
 * Tabela "RELAÇÃO DOS EQUIPAMENTOS".
 */
const POS_TABELA_ITEM_X = 43;
const POS_TABELA_DESCRICAO_X = 160;
const POS_TABELA_SERIE_X = 355;
const POS_TABELA_ACESSORIOS_X = 490;

/**
 * Cada valor representa a altura de uma linha da tabela.
 * A primeira linha preenchida usa o primeiro Y, e assim por diante.
 */
const POS_TABELA_LINHAS_Y = [480 , 450, 420];


const FONT_SIZE_PADRAO = 9;
const FONT_SIZE_TABELA = 8.5;

/**
 * Formata a data atual no padrão:
 * Recife, 16 de abril de 2026.
 */


/**
 * Corta texto longo para não estourar visualmente no PDF.
 */
function truncarTexto(texto: string, limite: number) {
  const limpo = String(texto ?? "").trim();

  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, limite - 3)}...`;
}

/**
 * Helper para desenhar texto na página.
 *
 * Centralizar isso em uma função facilita manutenção e ajuste posterior.
 */
function escreverTexto(
  page: PDFPage,
  texto: string,
  x: number,
  y: number,
  size = FONT_SIZE_PADRAO
) {
  page.drawText(texto, {
    x,
    y,
    size,
    color: rgb(0, 0, 0),
  });
}

/**
 * Busca os dados do usuário.
 */
async function buscarUsuario(usuarioId: number) {
  return prisma.usuarios.findUnique({
    where: { id: usuarioId },
  });
}

/**
 * Busca as máquinas vinculadas ao usuário e resolve nomes amigáveis.
 *
 * Regra atual:
 * - no máximo 3 máquinas, porque o modelo do PDF comporta
 *   uma lista curta visualmente.
 */
async function buscarMaquinasParaTermo(usuarioId: number): Promise<MaquinaParaTermo[]> {
  const [maquinas, setores, tipos, modelos] = await Promise.all([
    prisma.maquinas.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { id: "asc" },
      take: 3,
    }),
    prisma.setores.findMany(),
    prisma.tipos_equipamento.findMany(),
    prisma.modelos.findMany(),
  ]);

  const setoresMap = new Map(setores.map((item) => [item.id, item.nome]));
  const tiposMap = new Map(tipos.map((item) => [item.id, item.nome]));
  const modelosMap = new Map(modelos.map((item) => [item.id, item.nome]));

  return maquinas.map((maquina) => ({
    id: maquina.id,
    numero_serie: maquina.numero_serie,
    tipo:
      maquina.tipo_equipamento_id != null
        ? tiposMap.get(maquina.tipo_equipamento_id) ?? "-"
        : "-",
    modelo:
      maquina.modelo_id != null
        ? modelosMap.get(maquina.modelo_id) ?? "-"
        : "-",
    setor: setoresMap.get(maquina.setor_id) ?? "-",
  }));
}

/**
 * POST /api/usuarios/[id]/documentos/gerar-tr
 *
 * Responsabilidades:
 * - exigir login
 * - buscar usuário
 * - buscar máquinas vinculadas
 * - abrir PDF modelo
 * - preencher campos
 * - devolver PDF pronto para download
 *
 * Importante:
 * esta rota NÃO salva documento em banco e NÃO anexa arquivo no usuário.
 * O objetivo é apenas gerar o TR para impressão e assinatura manual.
 */
export async function POST(_req: NextRequest, context: ContextoParams) {
  try {
    await exigeLogin();

    const { id } = await context.params;
    const usuarioId = Number(id);

    if (Number.isNaN(usuarioId)) {
      return NextResponse.json(
        { erro: "ID de usuário inválido." },
        { status: 400 }
      );
    }

    const usuario = await buscarUsuario(usuarioId);

    if (!usuario) {
      return NextResponse.json(
        { erro: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const maquinas = await buscarMaquinasParaTermo(usuarioId);

    if (maquinas.length === 0) {
      return NextResponse.json(
        { erro: "O usuário não possui máquinas vinculadas para gerar o termo." },
        { status: 400 }
      );
    }

    /**
     * Como o schema atual de usuários não possui CPF,
     * o campo fica vazio por enquanto.
     */
    const cpf = "";

    /**
     * Regra atual:
     * setor do termo = setor da primeira máquina vinculada.
     */
    const setor = maquinas[0]?.setor ?? "-";

    /**
     * Caminho do PDF modelo.
     *
     * Coloque o arquivo em:
     * public/templates/termo-responsabilidade.pdf
     */
    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "termo-responsabilidade.pdf"
    );

    const templateBytes = await readFile(templatePath);

    const pdfDoc = await PDFDocument.load(templateBytes);

    await pdfDoc.embedFont(StandardFonts.Helvetica);
    await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages = pdfDoc.getPages();

    if (pages.length === 0) {
      return NextResponse.json(
        { erro: "Modelo de termo inválido ou vazio." },
        { status: 500 }
      );
    }

    const page1 = pages[0];

    /**
     * =========================
     * CAMPOS DO CABEÇALHO
     * =========================
     */

    escreverTexto(
      page1,
      truncarTexto(usuario.nome, 70),
      POS_NOME.x,
      POS_NOME.y,
      FONT_SIZE_PADRAO
    );

    escreverTexto(
      page1,
      truncarTexto(cpf, 25),
      POS_CPF.x,
      POS_CPF.y,
      FONT_SIZE_PADRAO
    );

    escreverTexto(
      page1,
      truncarTexto(setor, 40),
      POS_SETOR.x,
      POS_SETOR.y,
      FONT_SIZE_PADRAO
    );

    /**
     * =========================
     * TABELA DE EQUIPAMENTOS
     * =========================
     *
     * Regra definida:
     * - Item = tipo
     * - Descrição = modelo
     * - Nº de Série = numero_serie
     * - Acessórios = vazio
     */

    maquinas.forEach((maquina, index) => {
      const y = POS_TABELA_LINHAS_Y[index];

      if (typeof y !== "number") return;

      escreverTexto(
        page1,
        truncarTexto(maquina.tipo || "-", 18),
        POS_TABELA_ITEM_X,
        y,
        FONT_SIZE_TABELA
      );

      escreverTexto(
        page1,
        truncarTexto(maquina.modelo || "-", 28),
        POS_TABELA_DESCRICAO_X,
        y,
        FONT_SIZE_TABELA
      );

      escreverTexto(
        page1,
        truncarTexto(maquina.numero_serie || "-", 28),
        POS_TABELA_SERIE_X,
        y,
        FONT_SIZE_TABELA
      );

      escreverTexto(
        page1,
        "",
        POS_TABELA_ACESSORIOS_X,
        y,
        FONT_SIZE_TABELA
      );
    });

    /**
     * =========================
     * DATA
     * =========================
     */

    /**
     * Gera bytes finais do PDF.
     */
    const pdfBytes = await pdfDoc.save();

    /**
     * Nome amigável do arquivo para download.
     */
    const nomeArquivo = `TR-${usuario.nome
      .replace(/\s+/g, "-")
      .replace(/[^\w\-À-ÿ]/g, "")}-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json(
        { erro: "Não autenticado." },
        { status: 401 }
      );
    }

    console.error("Erro ao gerar termo de responsabilidade:", error);

    return NextResponse.json(
      { erro: "Erro ao gerar termo de responsabilidade." },
      { status: 500 }
    );
  }
}