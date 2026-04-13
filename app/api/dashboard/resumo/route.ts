import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Tipos de documento considerados obrigatórios para o dashboard.
 *
 * A contagem de pendência documental é baseada exatamente nessa lista.
 */
const TIPOS_OBRIGATORIOS = [
  "cessao_indeterminada",
  "devolucao_equipamento",
  "cessao_temporaria",
];

/**
 * GET /api/dashboard
 * ou GET /api/dashboard/resumo
 *
 * Responsabilidades:
 * - calcular indicadores gerais do sistema
 * - buscar últimas ações da auditoria
 * - identificar usuários com pendência documental
 *
 * Retorna:
 * - cards com métricas
 * - lista resumida de usuários pendentes
 * - últimas ações da auditoria
 */
export async function GET() {
  try {
    /**
     * Busca paralela dos indicadores principais.
     */
    const [totalMaquinas, maquinasLivres, totalUsuarios, ultimasAcoes, documentos] =
      await Promise.all([
        prisma.maquinas.count(),
        prisma.maquinas.count({
          where: {
            usuario_id: null,
          },
        }),
        prisma.usuarios.count(),
        prisma.auditoriaLog.findMany({
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          select: {
            id: true,
            entidade: true,
            entidadeId: true,
            acao: true,
            funcionarioNome: true,
            descricao: true,
            createdAt: true,
          },
        }),
        prisma.usuarioDocumento.findMany({
          where: {
            tipo: {
              in: TIPOS_OBRIGATORIOS,
            },
          },
          select: {
            usuarioId: true,
            tipo: true,
          },
        }),
      ]);

    /**
     * Busca todos os usuários para avaliar pendência documental.
     */
    const usuarios = await prisma.usuarios.findMany({
      orderBy: {
        nome: "asc",
      },
      select: {
        id: true,
        nome: true,
        login_email: true,
        login_maquina: true,
      },
    });

    /**
     * Mapa no formato:
     * usuarioId -> Set de tipos de documento já anexados
     */
    const documentosPorUsuario = new Map<number, Set<string>>();

    for (const doc of documentos) {
      if (!documentosPorUsuario.has(doc.usuarioId)) {
        documentosPorUsuario.set(doc.usuarioId, new Set());
      }

      documentosPorUsuario.get(doc.usuarioId)!.add(doc.tipo);
    }

    /**
     * Calcula quais usuários ainda não possuem todos
     * os documentos obrigatórios.
     */
    const usuariosPendentes = usuarios
      .map((usuario) => {
        const tiposUsuario = documentosPorUsuario.get(usuario.id) ?? new Set<string>();
        const faltando = TIPOS_OBRIGATORIOS.filter((tipo) => !tiposUsuario.has(tipo));

        return {
          id: usuario.id,
          nome: usuario.nome,
          login_email: usuario.login_email,
          login_maquina: usuario.login_maquina,
          faltando,
        };
      })
      .filter((usuario) => usuario.faltando.length > 0);

    return NextResponse.json({
      cards: {
        totalMaquinas,
        maquinasLivres,
        totalUsuarios,
        usuariosPendentesDocumentacao: usuariosPendentes.length,
      },
      usuariosPendentes: usuariosPendentes.slice(0, 10),
      ultimasAcoes,
    });
  } catch (error) {
    console.error("Erro ao carregar resumo do dashboard:", error);

    return NextResponse.json(
      { erro: "Não foi possível carregar o dashboard." },
      { status: 500 }
    );
  }
}