import { unlink } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";
import { criarLogAuditoria } from "@/lib/auditoria";

/**
 * Parâmetros dinâmicos esperados pela rota.
 */
type ContextoParams = {
  params: Promise<{ id: string; documentoId: string }>;
};

/**
 * DELETE /api/usuarios/[id]/documentos/[documentoId]
 *
 * Responsabilidades:
 * - exigir autenticação
 * - validar IDs
 * - validar usuário e documento
 * - apagar arquivo físico, se existir
 * - apagar registro no banco
 * - registrar auditoria
 */
export async function DELETE(_req: NextRequest, context: ContextoParams) {
  try {
    const funcionario = await exigeLogin();

    const { id, documentoId } = await context.params;
    const usuarioId = Number(id);
    const docId = Number(documentoId);

    if (Number.isNaN(usuarioId) || Number.isNaN(docId)) {
      return NextResponse.json(
        { erro: "Parâmetros inválidos." },
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

    const documento = await prisma.usuarioDocumento.findFirst({
      where: {
        id: docId,
        usuarioId,
      },
    });

    if (!documento) {
      return NextResponse.json(
        { erro: "Documento não encontrado." },
        { status: 404 }
      );
    }

    /**
     * Constrói o caminho absoluto do arquivo salvo no disco.
     */
    const caminhoAbsoluto = path.join(
      process.cwd(),
      "public",
      documento.caminho.replace(/^\//, "")
    );

    /**
     * Tenta remover o arquivo físico.
     *
     * Se falhar, a exclusão lógica no banco continua.
     * Isso evita travar a operação caso o arquivo já tenha sido removido
     * manualmente ou esteja indisponível.
     */
    try {
      await unlink(caminhoAbsoluto);
    } catch {
      // Falha silenciosa intencional.
    }

    await prisma.usuarioDocumento.delete({
      where: { id: docId },
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
      descricao: `Removeu um documento do usuário ${usuario.nome}`,
      antes: {
        documento_id: documento.id,
        tipo: documento.tipo,
        nome_arquivo: documento.nomeArquivo,
        caminho: documento.caminho,
      },
      depois: null,
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao remover documento:", error);
    return NextResponse.json(
      { erro: "Erro ao remover documento." },
      { status: 500 }
    );
  }
}