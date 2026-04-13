import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { exigeMaster } from "@/lib/auth";
import { criarLogAuditoria } from "@/lib/auditoria";

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * Busca um funcionário pelo ID.
 *
 * Função auxiliar para evitar repetição no PATCH e DELETE.
 */
async function buscarFuncionarioOuErro(id: number) {
  const funcionario = await prisma.funcionario.findUnique({
    where: { id },
  });

  if (!funcionario) {
    return null;
  }

  return funcionario;
}

/**
 * Snapshot enxuto usado nos logs de auditoria.
 */
function snapshotFuncionario(funcionario: {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
}) {
  return {
    id: funcionario.id,
    nome: funcionario.nome,
    email: funcionario.email,
    perfil: funcionario.perfil,
    ativo: funcionario.ativo,
  };
}

/**
 * Extrai apenas os campos necessários do usuário logado
 * para registro de auditoria.
 */
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

/**
 * PATCH /api/funcionarios/[id]
 *
 * Esta rota é multipropósito e usa body.acao para decidir o fluxo.
 *
 * Ações suportadas:
 * - inativar
 * - editar
 * - redefinirSenha
 */
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

    /**
     * Fluxo: inativar funcionário.
     */
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

      const antes = snapshotFuncionario(funcionario);

      const atualizado = await prisma.funcionario.update({
        where: { id: funcionarioId },
        data: { ativo: false },
      });

      await criarLogAuditoria({
        entidade: "funcionario",
        entidadeId: funcionarioId,
        acao: "inativacao",
        funcionario: autorAuditoria(logado),
        descricao: `Inativou o funcionário ${atualizado.nome}`,
        antes,
        depois: snapshotFuncionario(atualizado),
      });

      return NextResponse.json({ sucesso: true });
    }

    /**
     * Fluxo: editar dados básicos.
     */
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

      /**
       * Evita que o próprio master remova seu próprio perfil master.
       */
      if (funcionario.id === logado.id && perfil !== "master") {
        return NextResponse.json(
          { erro: "Você não pode remover seu próprio perfil master." },
          { status: 400 }
        );
      }

      /**
       * Evita remover o último master ativo do sistema.
       */
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

      const antes = snapshotFuncionario(funcionario);

      const atualizado = await prisma.funcionario.update({
        where: { id: funcionarioId },
        data: {
          nome,
          email,
          perfil,
        },
      });

      await criarLogAuditoria({
        entidade: "funcionario",
        entidadeId: funcionarioId,
        acao: "edicao",
        funcionario: autorAuditoria(logado),
        descricao: `Editou os dados do funcionário ${atualizado.nome}`,
        antes,
        depois: snapshotFuncionario(atualizado),
      });

      return NextResponse.json({ sucesso: true, funcionario: atualizado });
    }

    /**
     * Fluxo: redefinir senha.
     *
     * Observação:
     * por regra atual, senha de usuário master não pode ser redefinida
     * por esta tela.
     */
    if (acao === "redefinirSenha") {
      console.log("Redefinir senha de:", {
        id: funcionario.id,
        nome: funcionario.nome,
        perfil: funcionario.perfil,
      });

      if (funcionario.perfil === "master") {
        console.log("BLOQUEANDO MASTER");
        return NextResponse.json(
          {
            erro: "Não é permitido redefinir a senha de um usuário master por esta tela.",
          },
          { status: 400 }
        );
      }

      console.log("PASSOU DA TRAVA MASTER");

      const novaSenha = body?.novaSenha;

      if (!novaSenha || String(novaSenha).trim().length < 6) {
        return NextResponse.json(
          { erro: "A nova senha deve ter pelo menos 6 caracteres." },
          { status: 400 }
        );
      }

      const antes = snapshotFuncionario(funcionario);
      const senhaHash = await bcrypt.hash(novaSenha, 10);

      await prisma.funcionario.update({
        where: { id: funcionarioId },
        data: { senhaHash },
      });

      await criarLogAuditoria({
        entidade: "funcionario",
        entidadeId: funcionarioId,
        acao: "redefinicao_senha",
        funcionario: autorAuditoria(logado),
        descricao: `Redefiniu a senha do funcionário ${funcionario.nome}`,
        antes,
        depois: {
          ...antes,
          senha: "REDEFINIDA",
        },
      });

      return NextResponse.json({ sucesso: true });
    }

    return NextResponse.json({ erro: "Ação inválida." }, { status: 400 });
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

/**
 * DELETE /api/funcionarios/[id]
 *
 * Responsabilidades:
 * - exigir acesso master
 * - validar confirmação textual
 * - impedir exclusão da própria conta
 * - impedir exclusão de master
 * - excluir funcionário
 * - registrar auditoria
 */
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

    const antes = snapshotFuncionario(funcionario);

    await prisma.funcionario.delete({
      where: { id: funcionarioId },
    });

    await criarLogAuditoria({
      entidade: "funcionario",
      entidadeId: funcionarioId,
      acao: "exclusao",
      funcionario: autorAuditoria(logado),
      descricao: `Excluiu o funcionário ${funcionario.nome}`,
      antes,
      depois: null,
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