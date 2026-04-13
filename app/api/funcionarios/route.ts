import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { exigeMaster } from "@/lib/auth";
import { criarLogAuditoria } from "@/lib/auditoria";

/**
 * Gera um snapshot enxuto do funcionário para auditoria.
 *
 * Isso evita salvar o objeto inteiro do Prisma e padroniza
 * o formato de antes/depois nos logs.
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
 * POST /api/funcionarios
 *
 * Responsabilidades:
 * - exigir acesso master
 * - validar payload
 * - validar perfil permitido
 * - impedir email duplicado
 * - hash de senha
 * - criar funcionário
 * - registrar auditoria
 */
export async function POST(req: Request) {
  try {
    const logado = await exigeMaster();

    const body = await req.json();
    const nome = body?.nome?.trim();
    const email = body?.email?.trim().toLowerCase();
    const senha = body?.senha;
    const perfil = body?.perfil?.trim();

    if (!nome || !email || !senha || !perfil) {
      return NextResponse.json(
        { erro: "Nome, email, senha e perfil são obrigatórios." },
        { status: 400 }
      );
    }

    if (!["master", "operador"].includes(perfil)) {
      return NextResponse.json({ erro: "Perfil inválido." }, { status: 400 });
    }

    const existente = await prisma.funcionario.findUnique({
      where: { email },
    });

    if (existente) {
      return NextResponse.json(
        { erro: "Já existe um funcionário com esse email." },
        { status: 409 }
      );
    }

    /**
     * Nunca salva senha em texto puro.
     */
    const senhaHash = await bcrypt.hash(senha, 10);

    const funcionario = await prisma.funcionario.create({
      data: {
        nome,
        email,
        senhaHash,
        perfil,
        ativo: true,
      },
    });

    await criarLogAuditoria({
      entidade: "funcionario",
      entidadeId: funcionario.id,
      acao: "criacao",
      funcionario: {
        id: logado.id,
        nome: logado.nome,
        email: logado.email,
      },
      descricao: `Criou o funcionário ${funcionario.nome}`,
      antes: null,
      depois: snapshotFuncionario(funcionario),
    });

    return NextResponse.json({ sucesso: true, funcionario });
  } catch (error) {
    if (error instanceof Error && error.message === "SEM_PERMISSAO") {
      return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error(error);
    return NextResponse.json(
      { erro: "Erro interno ao criar funcionário." },
      { status: 500 }
    );
  }
}