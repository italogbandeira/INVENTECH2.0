import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nome = body?.nome?.trim();
    const email = body?.email?.trim().toLowerCase();
    const senha = body?.senha;

    if (!nome || !email || !senha) {
      return NextResponse.json(
        { erro: "Nome, email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const masterExistente = await prisma.funcionario.findFirst({
      where: { perfil: "master" },
    });

    if (masterExistente) {
      return NextResponse.json(
        { erro: "O usuário master já foi criado." },
        { status: 403 }
      );
    }

    const funcionarioExistente = await prisma.funcionario.findUnique({
      where: { email },
    });

    if (funcionarioExistente) {
      return NextResponse.json(
        { erro: "Já existe um funcionário com esse email." },
        { status: 409 }
      );
    }

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