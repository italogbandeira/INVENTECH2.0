import { prisma } from "@/lib/prisma";

type FuncionarioAuditoria = {
  id?: number | null;
  nome?: string | null;
  email?: string | null;
};

type CriarLogAuditoriaParams = {
  entidade: string;
  entidadeId?: number | null;
  acao: string;
  funcionario?: FuncionarioAuditoria | null;
  descricao?: string | null;
  antes?: unknown;
  depois?: unknown;
};

export async function criarLogAuditoria({
  entidade,
  entidadeId,
  acao,
  funcionario,
  descricao,
  antes,
  depois,
}: CriarLogAuditoriaParams) {
  try {
    await prisma.auditoriaLog.create({
      data: {
        entidade,
        entidadeId: entidadeId ?? null,
        acao,
        funcionarioId: funcionario?.id ?? null,
        funcionarioNome: funcionario?.nome ?? null,
        descricao: descricao ?? null,
        antes: antes ? JSON.stringify(antes, null, 2) : null,
        depois: depois ? JSON.stringify(depois, null, 2) : null,
      },
    });
  } catch (error) {
    console.error("Erro ao criar log de auditoria:", error);
  }
}