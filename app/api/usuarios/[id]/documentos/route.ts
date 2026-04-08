import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    mensagem: "Rota de documentos do usuário em construção.",
  });
}