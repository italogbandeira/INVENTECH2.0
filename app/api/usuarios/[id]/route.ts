import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";
import { criarLogAuditoria } from "@/lib/auditoria";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await exigeLogin();

    const { id } = await context.params;
    const usuarioId = Number(id);

    if (Number.isNaN(usuarioId)) {
      return NextResponse.json(
        { erro: "ID de usuário inválido." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuarios.findUnique({
      where: {
        id: usuarioId,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { erro: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const maquinas = await prisma.maquinas.findMany({
      where: {
        usuario_id: usuarioId,
      },
      orderBy: {
        numero_serie: "asc",
      },
    });

    const [setores, modelos, contratos, origens, tipos] = await Promise.all([
      prisma.setores.findMany(),
      prisma.modelos.findMany(),
      prisma.contratos.findMany(),
      prisma.origens.findMany(),
      prisma.tipos_equipamento.findMany(),
    ]);

    const setoresMap = new Map(setores.map((item) => [item.id, item.nome]));
    const modelosMap = new Map(modelos.map((item) => [item.id, item.nome]));
    const contratosMap = new Map(contratos.map((item) => [item.id, item.nome]));
    const origensMap = new Map(origens.map((item) => [item.id, item.nome]));
    const tiposMap = new Map(tipos.map((item) => [item.id, item.nome]));

    const maquinasDetalhadas = maquinas.map((maquina) => ({
      id: maquina.id,
      numero_serie: maquina.numero_serie,
      setor: setoresMap.get(maquina.setor_id) ?? "-",
      tipo_equipamento:
        maquina.tipo_equipamento_id != null
          ? tiposMap.get(maquina.tipo_equipamento_id) ?? "-"
          : "-",
      modelo:
        maquina.modelo_id != null
          ? modelosMap.get(maquina.modelo_id) ?? "-"
          : "-",
      contrato:
        maquina.contrato_id != null
          ? contratosMap.get(maquina.contrato_id) ?? "-"
          : "-",
      origem:
        maquina.origem_id != null
          ? origensMap.get(maquina.origem_id) ?? "-"
          : "-",
      esset: maquina.esset ?? "-",
    }));

    return NextResponse.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        login_email: usuario.login_email,
        login_maquina: usuario.login_maquina,
      },
      maquinas: maquinasDetalhadas,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao buscar detalhe do usuário:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar detalhe do usuário." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const funcionario = await exigeLogin();

    const { id } = await context.params;
    const usuarioId = Number(id);

    if (Number.isNaN(usuarioId)) {
      return NextResponse.json(
        { erro: "ID de usuário inválido." },
        { status: 400 }
      );
    }

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

    const antes = await prisma.usuarios.findUnique({
      where: {
        id: usuarioId,
      },
    });

    if (!antes) {
      return NextResponse.json(
        { erro: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const usuario = await prisma.usuarios.update({
      where: {
        id: usuarioId,
      },
      data: {
        nome,
        login_email,
        login_maquina,
      },
    });

    await criarLogAuditoria({
      entidade: "usuario",
      entidadeId: usuario.id,
      acao: "edicao",
      funcionario: {
        id: funcionario.id,
        nome: funcionario.nome,
        email: funcionario.email,
      },
      descricao: `Editou o usuário ${usuario.nome}`,
      antes: {
        id: antes.id,
        nome: antes.nome,
        login_email: antes.login_email,
        login_maquina: antes.login_maquina,
      },
      depois: {
        id: usuario.id,
        nome: usuario.nome,
        login_email: usuario.login_email,
        login_maquina: usuario.login_maquina,
      },
    });

    return NextResponse.json(usuario);
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao editar usuário:", error);
    return NextResponse.json(
      { erro: "Erro ao editar usuário." },
      { status: 500 }
    );
  }
}