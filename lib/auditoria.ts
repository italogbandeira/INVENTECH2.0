import { prisma } from "@/lib/prisma";

/**
 * Estrutura mínima do funcionário responsável pela ação.
 *
 * Os campos são opcionais porque, em alguns fluxos,
 * o sistema pode registrar logs sem todos os dados completos.
 */
type FuncionarioAuditoria = {
  id?: number | null;
  nome?: string | null;
  email?: string | null;
};

/**
 * Parâmetros aceitos para criação de um log de auditoria.
 *
 * Campos importantes:
 * - entidade: qual módulo/recurso foi afetado (ex: usuario, maquina)
 * - entidadeId: ID do registro afetado
 * - acao: tipo da ação (ex: criacao, edicao, exclusao)
 * - funcionario: quem executou
 * - descricao: descrição humana para leitura rápida
 * - antes: estado anterior do dado
 * - depois: estado posterior do dado
 */
type CriarLogAuditoriaParams = {
  entidade: string;
  entidadeId?: number | null;
  acao: string;
  funcionario?: FuncionarioAuditoria | null;
  descricao?: string | null;
  antes?: unknown;
  depois?: unknown;
};

/**
 * Cria um log de auditoria no banco.
 *
 * Estratégia adotada:
 * - não interromper o fluxo principal em caso de erro
 * - serializar os campos "antes" e "depois" em JSON formatado
 *
 * Isso é útil porque auditoria é importante, mas não deve
 * necessariamente derrubar uma operação de negócio se falhar.
 */
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
    /**
     * Falha de auditoria não deve quebrar o fluxo principal.
     * Por isso, apenas registramos no console.
     */
    console.error("Erro ao criar log de auditoria:", error);
  }
}