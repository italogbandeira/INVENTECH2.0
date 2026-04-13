import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

/**
 * POST /api/logout
 *
 * Responsabilidades:
 * - invalidar a sessão atual no navegador
 * - apagar o cookie de autenticação
 *
 * Estratégia:
 * o backend sobrescreve o cookie com valor vazio e expiração antiga,
 * fazendo o navegador descartar a sessão.
 */
export async function POST() {
  const response = NextResponse.json({ sucesso: true });

  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}