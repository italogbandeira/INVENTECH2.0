import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, criarToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    

    const body = await req.json();
    const email = body?.email?.trim().toLowerCase();
    const senha = body?.senha;

    

    if (!email || !senha) {
      return NextResponse.json(
        { erro: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const funcionario = await prisma.funcionario.findUnique({
      where: { email },
    });

    

    if (!funcionario) {
      return NextResponse.json(
        { erro: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    if (!funcionario.ativo) {
      return NextResponse.json(
        { erro: "Funcionário inativo." },
        { status: 403 }
      );
    }

    const senhaCorreta = await bcrypt.compare(senha, funcionario.senhaHash);

    
    if (!senhaCorreta) {
      return NextResponse.json(
        { erro: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    const token = await criarToken({
      id: funcionario.id,
      nome: funcionario.nome,
      email: funcionario.email,
      perfil: funcionario.perfil,
    });

    

    const response = NextResponse.json({ sucesso: true });

    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    

    return response;
  } catch (error) {
    console.error("ERRO REAL DO LOGIN:");
    console.error(error);
    return NextResponse.json(
      { erro: "Erro interno ao fazer login." },
      { status: 500 }
    );
  }
}