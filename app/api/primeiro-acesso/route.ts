import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/primeiro-acesso
 *
 * Responsabilidades:
 * - criar a conta master inicial do sistema
 * - impedir criação de mais de um master nesse fluxo
 * - validar se o email já existe
 * - salvar senha com hash seguro
 *
 * Regras de negócio importantes:
 * - nome, email e senha são obrigatórios
 * - só permite criação se ainda não existir nenhum funcionário master
 * - email é normalizado para lowercase antes de salvar
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nome = body?.nome?.trim();
    const email = body?.email?.trim().toLowerCase();
    const senha = body?.senha;

    /**
     * Validação básica do payload recebido.
     */
    if (!nome || !email || !senha) {
      return NextResponse.json(
        { erro: "Nome, email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    /**
     * Regra principal do primeiro acesso:
     * só pode existir um primeiro master criado por esse fluxo.
     */
    const masterExistente = await prisma.funcionario.findFirst({
      where: { perfil: "master" },
    });

    if (masterExistente) {
      return NextResponse.json(
        { erro: "O usuário master já foi criado." },
        { status: 403 }
      );
    }

    /**
     * Valida conflito de email antes de criar.
     */
    const funcionarioExistente = await prisma.funcionario.findUnique({
      where: { email },
    });

    if (funcionarioExistente) {
      return NextResponse.json(
        { erro: "Já existe um funcionário com esse email." },
        { status: 409 }
      );
    }

    /**
     * Hash da senha com bcrypt antes de persistir no banco.
     */
    const senhaHash = await bcrypt.hash(senha, 10);

    await prisma.funcionario.create({
      data: {
        nome,
        email,
        senhaHash,
        ativo: true,
        perfil: "master",
      },
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("Erro ao criar master no primeiro acesso:", error);

    return NextResponse.json(
      { erro: "Erro interno ao criar usuário master." },
      { status: 500 }
    );
  }
}