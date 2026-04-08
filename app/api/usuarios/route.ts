import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";

export async function GET() {
  try {
    await exigeLogin();

    const usuarios = await prisma.usuarios.findMany({
      orderBy: {
        nome: "asc",
      },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao listar usuários:", error);
    return NextResponse.json(
      { erro: "Erro ao listar usuários." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await exigeLogin();

    const body = await req.json();

    const nome = body?.nome?.trim();
    const login_email = body?.login_email?.trim() || null;
    const login_maquina = body?.login_maquina?.trim() || null;

    if (!nome) {
      return NextResponse.json(
        { erro: "Nome é obrigatório." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuarios.create({
      data: {
        nome,
        login_email,
        login_maquina,
      },
    });

    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      { erro: "Erro ao criar usuário." },
      { status: 500 }
    );
  }
}