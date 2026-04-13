import { NextResponse } from "next/server";
import { getFuncionarioLogado } from "@/lib/auth";

/**
 * GET /api/me
 *
 * Responsabilidades:
 * - recuperar o funcionário autenticado a partir do cookie
 * - devolver os dados básicos da sessão atual
 *
 * Comportamento:
 * - se não houver sessão válida, retorna 401 com funcionario: null
 * - se houver sessão válida, retorna funcionario preenchido
 */
export async function GET() {
  const funcionario = await getFuncionarioLogado();

  if (!funcionario) {
    return NextResponse.json({ funcionario: null }, { status: 401 });
  }

  return NextResponse.json({ funcionario });
}