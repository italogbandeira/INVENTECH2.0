import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return NextResponse.json({
    mensagem: "Rota de detalhe do usuário em construção.",
    id,
  });
}