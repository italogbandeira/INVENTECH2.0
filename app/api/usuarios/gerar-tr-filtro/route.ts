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

type MaquinaParaTermo = {
  id: number;
  numero_serie: string;
  tipo: string;
  modelo: string;
  setor: string;
};

type UsuarioBasico = {
  id: number;
  nome: string;
  login_email: string | null;
  login_maquina: string | null;
};

const POS_NOME = { x: 100, y: 701 };
const POS_CPF = { x: 454, y: 582 };
const POS_SETOR = { x: 180, y: 689 };

const POS_TABELA_ITEM_X = 43;
const POS_TABELA_DESCRICAO_X = 160;
const POS_TABELA_SERIE_X = 355;
const POS_TABELA_ACESSORIOS_X = 490;

const POS_TABELA_LINHAS_Y = [480, 450, 420];

const FONT_SIZE_PADRAO = 9;
const FONT_SIZE_TABELA = 8.5;

function truncarTexto(texto: string, limite: number) {
  const limpo = String(texto ?? "").trim();

  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, limite - 3)}...`;
}

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

async function buscarMaquinasParaTermo(
  usuarioId: number
): Promise<MaquinaParaTermo[]> {
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

async function gerarPdfUsuario(usuario: UsuarioBasico) {
  const maquinas = await buscarMaquinasParaTermo(usuario.id);

  if (maquinas.length === 0) {
    return null;
  }

  const cpf = "";
  const setor = maquinas[0]?.setor ?? "-";

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
    throw new Error("Modelo de termo inválido ou vazio.");
  }

  const page1 = pages[0];

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
   * Não preencher a data automaticamente no PDF.
   */

  return pdfDoc;
}

export async function POST(req: NextRequest) {
  try {
    await exigeLogin();

    const body = await req.json().catch(() => null);
    const setor = String(body?.setor ?? "").trim();

    if (!setor) {
      return NextResponse.json(
        { erro: "Informe um setor para gerar os TRs do filtro." },
        { status: 400 }
      );
    }

    const setores = await prisma.setores.findMany({
      where: {
        nome: {
          contains: setor,
        },
      },
      select: {
        id: true,
        nome: true,
      },
    });

    const setorIds = setores.map((item) => item.id);

    if (setorIds.length === 0) {
      return NextResponse.json(
        { erro: "Nenhum setor encontrado para o filtro informado." },
        { status: 404 }
      );
    }

    const maquinasDoSetor = await prisma.maquinas.findMany({
      where: {
        setor_id: {
          in: setorIds,
        },
        usuario_id: {
          not: null,
        },
      },
      select: {
        usuario_id: true,
      },
    });

    const usuarioIds = Array.from(
      new Set(
        maquinasDoSetor
          .map((maquina) => maquina.usuario_id)
          .filter((id): id is number => typeof id === "number")
      )
    );

    if (usuarioIds.length === 0) {
      return NextResponse.json(
        { erro: "Nenhum usuário com máquinas nesse setor foi encontrado." },
        { status: 404 }
      );
    }

    const usuarios = await prisma.usuarios.findMany({
      where: {
        id: {
          in: usuarioIds,
        },
      },
      orderBy: {
        nome: "asc",
      },
      select: {
        id: true,
        nome: true,
        login_email: true,
        login_maquina: true,
      },
    });

    const pdfFinal = await PDFDocument.create();

    let totalGerados = 0;

    for (const usuario of usuarios) {
      const pdfUsuario = await gerarPdfUsuario(usuario);

      if (!pdfUsuario) continue;

      const paginas = await pdfFinal.copyPages(
        pdfUsuario,
        pdfUsuario.getPageIndices()
      );

      paginas.forEach((pagina) => pdfFinal.addPage(pagina));
      totalGerados++;
    }

    if (totalGerados === 0) {
      return NextResponse.json(
        { erro: "Nenhum TR pôde ser gerado para o filtro atual." },
        { status: 400 }
      );
    }

    const pdfBytes = await pdfFinal.save();

    const nomeArquivo = `TR-setor-${setor
      .replace(/\s+/g, "-")
      .replace(/[^\w\-À-ÿ]/g, "")}.pdf`;

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

    console.error("Erro ao gerar TR em lote por filtro:", error);

    return NextResponse.json(
      { erro: "Erro ao gerar TR em lote por filtro." },
      { status: 500 }
    );
  }
}