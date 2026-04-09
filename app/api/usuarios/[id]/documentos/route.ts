import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";
import { criarLogAuditoria } from "@/lib/auditoria";

type ContextoParams = {
  params: Promise<{ id: string }>;
};

const TIPOS_VALIDOS = [
  "cessao_indeterminada",
  "devolucao_equipamento",
  "cessao_temporaria",
] as const;

function nomeTipoAmigavel(tipo: string) {
  const mapa: Record<string, string> = {
    cessao_indeterminada: "Termo de Cessão de Equip - Tempo Indeterminado",
    devolucao_equipamento: "Termo de Devolução de Equipamento",
    cessao_temporaria: "Termo de Cessão Temporária de Equipamento",
  };

  return mapa[tipo] ?? tipo;
}

export async function GET(_req: NextRequest, context: ContextoParams) {
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

    const usuario = await prisma.usuarios.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      return NextResponse.json(
        { erro: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const documentos = await prisma.usuarioDocumento.findMany({
      where: { usuarioId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documentos });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao buscar documentos do usuário:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar documentos do usuário." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: ContextoParams) {
  try {
    const funcionario = await exigeLogin();

    const { id } = await context.params;
    const usuarioId = Number(id);

    if (Number.isNaN(usuarioId)) {
      return NextResponse.json(
        { erro: "ID de usuário inválido." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      return NextResponse.json(
        { erro: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const tipo = String(formData.get("tipo") || "");
    const arquivo = formData.get("arquivo");

    if (!TIPOS_VALIDOS.includes(tipo as (typeof TIPOS_VALIDOS)[number])) {
      return NextResponse.json(
        { erro: "Tipo de documento inválido." },
        { status: 400 }
      );
    }

    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        { erro: "Arquivo não enviado." },
        { status: 400 }
      );
    }

    const bytes = await arquivo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const nomeSeguro = `${Date.now()}-${arquivo.name.replace(/\s+/g, "-")}`;
    const pastaAbsoluta = path.join(
      process.cwd(),
      "public",
      "uploads",
      "usuarios",
      String(usuarioId)
    );
    const caminhoAbsoluto = path.join(pastaAbsoluta, nomeSeguro);
    const caminhoRelativo = `/uploads/usuarios/${usuarioId}/${nomeSeguro}`;

    await mkdir(pastaAbsoluta, { recursive: true });
    await writeFile(caminhoAbsoluto, buffer);

    const documento = await prisma.usuarioDocumento.create({
      data: {
        usuarioId,
        tipo,
        nomeArquivo: arquivo.name,
        caminho: caminhoRelativo,
      },
    });

    await criarLogAuditoria({
      entidade: "usuario",
      entidadeId: usuario.id,
      acao: "edicao",
      funcionario: {
        id: funcionario.id,
        nome: funcionario.nome,
        email: funcionario.email,
      },
      descricao: `Anexou o documento "${nomeTipoAmigavel(tipo)}" ao usuário ${usuario.nome}`,
      antes: null,
      depois: {
        documento_id: documento.id,
        tipo: documento.tipo,
        nome_arquivo: documento.nomeArquivo,
        caminho: documento.caminho,
      },
    });

    return NextResponse.json(documento, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao enviar documento:", error);
    return NextResponse.json(
      { erro: "Erro ao enviar documento." },
      { status: 500 }
    );
  }
}