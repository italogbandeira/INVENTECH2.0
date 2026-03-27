import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { exigeMaster } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await exigeMaster();

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
      return NextResponse.json(
        { erro: "Perfil inválido." },
        { status: 400 }
      );
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