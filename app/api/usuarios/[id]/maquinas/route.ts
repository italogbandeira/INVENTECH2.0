import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";
import { criarLogAuditoria } from "@/lib/auditoria";

/**
 * Tipo com os mapas de tradução de IDs -> nomes.
 *
 * Usado para montar respostas amigáveis para a UI.
 */
type ContextoParams = {
  params: Promise<{ id: string }>;
};

type Mapas = {
  setoresMap: Map<number, string>;
  tiposMap: Map<number, string>;
  modelosMap: Map<number, string>;
  contratosMap: Map<number, string>;
  origensMap: Map<number, string>;
};

/**
 * Converte uma máquina do formato bruto do banco
 * para um formato detalhado e amigável para a tela.
 */
function montarDetalheMaquina(
  maquina: {
    id: number;
    numero_serie: string;
    setor_id: number;
    tipo_equipamento_id: number | null;
    modelo_id: number | null;
    contrato_id: number | null;
    origem_id: number | null;
    esset: string | null;
    usuario_id?: number | null;
  },
  mapas: Mapas
) {
  return {
    id: maquina.id,
    numero_serie: maquina.numero_serie,
    setor: mapas.setoresMap.get(maquina.setor_id) ?? "-",
    tipo_equipamento:
      maquina.tipo_equipamento_id != null
        ? mapas.tiposMap.get(maquina.tipo_equipamento_id) ?? "-"
        : "-",
    modelo:
      maquina.modelo_id != null
        ? mapas.modelosMap.get(maquina.modelo_id) ?? "-"
        : "-",
    contrato:
      maquina.contrato_id != null
        ? mapas.contratosMap.get(maquina.contrato_id) ?? "-"
        : "-",
    origem:
      maquina.origem_id != null
        ? mapas.origensMap.get(maquina.origem_id) ?? "-"
        : "-",
    esset: maquina.esset ?? "-",
    usuario_id: maquina.usuario_id ?? null,
  };
}

/**
 * Carrega os catálogos auxiliares e já devolve os mapas montados.
 */
async function carregarMapas() {
  const [setores, modelos, contratos, origens, tipos] = await Promise.all([
    prisma.setores.findMany(),
    prisma.modelos.findMany(),
    prisma.contratos.findMany(),
    prisma.origens.findMany(),
    prisma.tipos_equipamento.findMany(),
  ]);

  return {
    setores,
    setoresMap: new Map(setores.map((item) => [item.id, item.nome])),
    modelosMap: new Map(modelos.map((item) => [item.id, item.nome])),
    contratosMap: new Map(contratos.map((item) => [item.id, item.nome])),
    origensMap: new Map(origens.map((item) => [item.id, item.nome])),
    tiposMap: new Map(tipos.map((item) => [item.id, item.nome])),
  };
}

/**
 * GET /api/usuarios/[id]/maquinas
 *
 * Responsabilidades:
 * - exigir autenticação
 * - validar usuário
 * - devolver:
 *   - máquinas vinculadas ao usuário
 *   - máquinas disponíveis para vínculo
 *
 * Regra especial:
 * máquinas disponíveis são consideradas:
 * - sem usuário vinculado
 * - ou pertencentes ao setor "máquinas livres"
 */
export async function GET(_req: NextRequest, context: ContextoParams) {
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
      where: { id: usuarioId },
    });

    if (!usuario) {
      return NextResponse.json(
        { erro: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const mapas = await carregarMapas();

    const setorMaquinasLivres = mapas.setores.find(
      (setor) => setor.nome.trim().toLowerCase() === "máquinas livres"
    );

    const [maquinasVinculadas, maquinasDisponiveisBrutas] = await Promise.all([
      prisma.maquinas.findMany({
        where: { usuario_id: usuarioId },
        orderBy: { numero_serie: "asc" },
      }),
      prisma.maquinas.findMany({
        where: {
          OR: [
            { usuario_id: null },
            ...(setorMaquinasLivres ? [{ setor_id: setorMaquinasLivres.id }] : []),
          ],
        },
        orderBy: { numero_serie: "asc" },
      }),
    ]);

    /**
     * Evita que uma máquina já vinculada apareça também como disponível.
     */
    const idsVinculadas = new Set(maquinasVinculadas.map((maquina) => maquina.id));

    const maquinasDisponiveis = maquinasDisponiveisBrutas.filter(
      (maquina) => !idsVinculadas.has(maquina.id)
    );

    return NextResponse.json({
      vinculadas: maquinasVinculadas.map((maquina) =>
        montarDetalheMaquina(maquina, mapas)
      ),
      disponiveis: maquinasDisponiveis.map((maquina) =>
        montarDetalheMaquina(maquina, mapas)
      ),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao buscar máquinas do usuário:", error);
    return NextResponse.json(
      { erro: "Erro ao buscar máquinas do usuário." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/usuarios/[id]/maquinas
 *
 * Responsabilidades:
 * - exigir autenticação
 * - validar usuário e máquina
 * - vincular a máquina ao usuário
 * - registrar auditoria do vínculo
 */
export async function PUT(req: NextRequest, context: ContextoParams) {
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
    const maquinaId = Number(body?.maquinaId);

    if (Number.isNaN(maquinaId)) {
      return NextResponse.json(
        { erro: "ID da máquina inválido." },
        { status: 400 }
      );
    }

    const [usuario, maquinaAntes] = await Promise.all([
      prisma.usuarios.findUnique({ where: { id: usuarioId } }),
      prisma.maquinas.findUnique({ where: { id: maquinaId } }),
    ]);

    if (!usuario) {
      return NextResponse.json(
        { erro: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    if (!maquinaAntes) {
      return NextResponse.json(
        { erro: "Máquina não encontrada." },
        { status: 404 }
      );
    }

    const maquina = await prisma.maquinas.update({
      where: { id: maquinaId },
      data: {
        usuario_id: usuarioId,
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
      descricao: `Vinculou a máquina ${maquina.numero_serie} ao usuário ${usuario.nome}`,
      antes: {
        maquina_id: maquinaAntes.id,
        numero_serie: maquinaAntes.numero_serie,
        usuario_id: maquinaAntes.usuario_id,
      },
      depois: {
        maquina_id: maquina.id,
        numero_serie: maquina.numero_serie,
        usuario_id: maquina.usuario_id,
      },
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao vincular máquina ao usuário:", error);
    return NextResponse.json(
      { erro: "Erro ao vincular máquina ao usuário." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/usuarios/[id]/maquinas
 *
 * Responsabilidades:
 * - exigir autenticação
 * - validar usuário e máquina
 * - remover o vínculo da máquina com o usuário
 * - registrar auditoria da remoção
 */
export async function DELETE(req: NextRequest, context: ContextoParams) {
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
    const maquinaId = Number(body?.maquinaId);

    if (Number.isNaN(maquinaId)) {
      return NextResponse.json(
        { erro: "ID da máquina inválido." },
        { status: 400 }
      );
    }

    const [usuario, maquinaAntes] = await Promise.all([
      prisma.usuarios.findUnique({ where: { id: usuarioId } }),
      prisma.maquinas.findUnique({ where: { id: maquinaId } }),
    ]);

    if (!usuario) {
      return NextResponse.json(
        { erro: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    if (!maquinaAntes) {
      return NextResponse.json(
        { erro: "Máquina não encontrada." },
        { status: 404 }
      );
    }

    const maquina = await prisma.maquinas.update({
      where: { id: maquinaId },
      data: {
        usuario_id: null,
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
      descricao: `Removeu a máquina ${maquina.numero_serie} do usuário ${usuario.nome}`,
      antes: {
        maquina_id: maquinaAntes.id,
        numero_serie: maquinaAntes.numero_serie,
        usuario_id: maquinaAntes.usuario_id,
      },
      depois: {
        maquina_id: maquina.id,
        numero_serie: maquina.numero_serie,
        usuario_id: maquina.usuario_id,
      },
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao remover vínculo da máquina:", error);
    return NextResponse.json(
      { erro: "Erro ao remover vínculo da máquina." },
      { status: 500 }
    );
  }
}