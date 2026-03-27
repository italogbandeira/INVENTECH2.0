import { NextResponse } from "next/server";
import { getFuncionarioLogado } from "@/lib/auth";

export async function GET() {
  const funcionario = await getFuncionarioLogado();

  if (!funcionario) {
    return NextResponse.json({ funcionario: null }, { status: 401 });
  }

  return NextResponse.json({ funcionario });
}