import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, criarToken } from "@/lib/auth";

/**
 * POST /api/login
 *
 * Responsabilidades:
 * - validar credenciais recebidas
 * - buscar funcionário pelo email
 * - verificar se a conta está ativa
 * - comparar senha em texto plano com senha hash
 * - gerar JWT
 * - gravar cookie de autenticação
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email?.trim().toLowerCase();
    const senha = body?.senha;

    /**
     * Validação básica do payload.
     */
    if (!email || !senha) {
      return NextResponse.json(
        { erro: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    /**
     * Busca o funcionário pelo email normalizado.
     */
    const funcionario = await prisma.funcionario.findUnique({
      where: { email },
    });

    /**
     * Para segurança, não distingue muito o erro
     * entre email inexistente e senha incorreta.
     */
    if (!funcionario) {
      return NextResponse.json(
        { erro: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    /**
     * Bloqueia acesso de funcionário inativo.
     */
    if (!funcionario.ativo) {
      return NextResponse.json(
        { erro: "Funcionário inativo." },
        { status: 403 }
      );
    }

    /**
     * Compara senha fornecida com o hash salvo no banco.
     */
    const senhaCorreta = await bcrypt.compare(senha, funcionario.senhaHash);

    if (!senhaCorreta) {
      return NextResponse.json(
        { erro: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    /**
     * Gera token JWT com os dados mínimos da sessão.
     */
    const token = await criarToken({
      id: funcionario.id,
      nome: funcionario.nome,
      email: funcionario.email,
      perfil: funcionario.perfil,
    });

    const response = NextResponse.json({ sucesso: true });

    /**
     * Persiste a sessão no cookie.
     *
     * maxAge atual:
     * 8 horas
     *
     * Observação:
     * o JWT criado em auth.ts expira em 7 dias,
     * mas o cookie aqui dura 8 horas.
     * Isso significa que, na prática, a sessão do navegador
     * expira antes do token.
     */
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