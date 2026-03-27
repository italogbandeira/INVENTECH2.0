import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { exigeMaster } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

async function buscarFuncionarioOuErro(id: number) {
  const funcionario = await prisma.funcionario.findUnique({
    where: { id },
  });

  if (!funcionario) {
    return null;
  }

  return funcionario;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const logado = await exigeMaster();
    const { id } = await params;
    const funcionarioId = Number(id);

    if (!funcionarioId || Number.isNaN(funcionarioId)) {
      return NextResponse.json({ erro: "ID inválido." }, { status: 400 });
    }

    const funcionario = await buscarFuncionarioOuErro(funcionarioId);

    if (!funcionario) {
      return NextResponse.json(
        { erro: "Funcionário não encontrado." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const acao = body?.acao;

    if (acao === "inativar") {
      if (funcionario.id === logado.id) {
        return NextResponse.json(
          { erro: "Você não pode inativar sua própria conta." },
          { status: 400 }
        );
      }

      if (funcionario.perfil === "master") {
        return NextResponse.json(
          { erro: "Não é permitido inativar um usuário master." },
          { status: 400 }
        );
      }

      await prisma.funcionario.update({
        where: { id: funcionarioId },
        data: { ativo: false },
      });

      return NextResponse.json({ sucesso: true });
    }

    if (acao === "editar") {
      const nome = body?.nome?.trim();
      const email = body?.email?.trim().toLowerCase();
      const perfil = body?.perfil?.trim();

      if (!nome || !email || !perfil) {
        return NextResponse.json(
          { erro: "Nome, email e perfil são obrigatórios." },
          { status: 400 }
        );
      }

      if (!["master", "operador"].includes(perfil)) {
        return NextResponse.json(
          { erro: "Perfil inválido." },
          { status: 400 }
        );
      }

      const emailEmUso = await prisma.funcionario.findFirst({
        where: {
          email,
          NOT: { id: funcionarioId },
        },
      });

      if (emailEmUso) {
        return NextResponse.json(
          { erro: "Já existe outro funcionário com esse email." },
          { status: 409 }
        );
      }

      if (funcionario.id === logado.id && perfil !== "master") {
        return NextResponse.json(
          { erro: "Você não pode remover seu próprio perfil master." },
          { status: 400 }
        );
      }

      if (funcionario.perfil === "master" && perfil !== "master") {
        const totalMasters = await prisma.funcionario.count({
          where: { perfil: "master", ativo: true },
        });

        if (totalMasters <= 1) {
          return NextResponse.json(
            { erro: "Não é permitido remover o último master do sistema." },
            { status: 400 }
          );
        }
      }

      const atualizado = await prisma.funcionario.update({
        where: { id: funcionarioId },
        data: {
          nome,
          email,
          perfil,
        },
      });

      return NextResponse.json({ sucesso: true, funcionario: atualizado });
    }

    if (acao === "redefinirSenha") {
      const novaSenha = body?.novaSenha;

      if (!novaSenha || String(novaSenha).trim().length < 6) {
        return NextResponse.json(
          { erro: "A nova senha deve ter pelo menos 6 caracteres." },
          { status: 400 }
        );
      }

      const senhaHash = await bcrypt.hash(novaSenha, 10);

      await prisma.funcionario.update({
        where: { id: funcionarioId },
        data: { senhaHash },
      });

      return NextResponse.json({ sucesso: true });
    }

    return NextResponse.json(
      { erro: "Ação inválida." },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "SEM_PERMISSAO") {
      return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error(error);
    return NextResponse.json(
      { erro: "Erro interno ao processar ação no funcionário." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const logado = await exigeMaster();
    const { id } = await params;
    const funcionarioId = Number(id);

    if (!funcionarioId || Number.isNaN(funcionarioId)) {
      return NextResponse.json({ erro: "ID inválido." }, { status: 400 });
    }

    const funcionario = await buscarFuncionarioOuErro(funcionarioId);

    if (!funcionario) {
      return NextResponse.json(
        { erro: "Funcionário não encontrado." },
        { status: 404 }
      );
    }

    if (funcionario.id === logado.id) {
      return NextResponse.json(
        { erro: "Você não pode excluir sua própria conta." },
        { status: 400 }
      );
    }

    if (funcionario.perfil === "master") {
      return NextResponse.json(
        { erro: "Não é permitido excluir um usuário master." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const confirmacao = body?.confirmacao;

    if (confirmacao !== "DELETAR") {
      return NextResponse.json(
        { erro: 'Confirmação inválida. Digite "DELETAR".' },
        { status: 400 }
      );
    }

    await prisma.funcionario.delete({
      where: { id: funcionarioId },
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    if (error instanceof Error && error.message === "SEM_PERMISSAO") {
      return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error(error);
    return NextResponse.json(
      { erro: "Erro interno ao excluir funcionário." },
      { status: 500 }
    );
  }
}