import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";
import { criarLogAuditoria } from "@/lib/auditoria";

/**
 * GET /api/usuarios/[id]
 *
 * Responsabilidades:
 * - exigir autenticação
 * - validar ID
 * - buscar usuário
 * - buscar máquinas vinculadas ao usuário
 * - montar resposta detalhada com nomes amigáveis
 *
 * Observação:
 * esta rota retorna os dados do usuário e também um resumo
 * das máquinas vinculadas já traduzidas com nomes de setor,
 * modelo, contrato, origem e tipo.
 */
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

    /**
     * Carrega catálogos auxiliares para traduzir IDs em nomes.
     */
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

    /**
     * Converte as máquinas do formato bruto do banco
     * para um formato amigável para a UI.
     */
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
          : "-"
          ,
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

/**
 * PUT /api/usuarios/[id]
 *
 * Responsabilidades:
 * - exigir autenticação
 * - validar ID
 * - validar nome obrigatório
 * - atualizar usuário
 * - registrar auditoria comparando antes e depois
 */
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

    /**
     * Busca estado anterior para auditoria.
     */
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