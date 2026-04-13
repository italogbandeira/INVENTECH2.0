import { NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { prisma } from "@/lib/prisma";
import { exigeMaster } from "@/lib/auth";
import { criarLogAuditoria } from "@/lib/auditoria";

/**
 * Estrutura esperada de cada linha do CSV importado.
 *
 * Os nomes das colunas já são os nomes normalizados após o parser.
 */
type LinhaCsv = {
  serial?: string;
  criado_em?: string;
  setor?: string;
  usuario?: string;
  empresa_contrato?: string;
  modelo?: string;
  categoria?: string;
  descricao?: string;
  contrato?: string;
  ip_maquina?: string;
  origem?: string;
};

/**
 * Converte valores vazios para null.
 */
function textoOuNull(valor: unknown) {
  const texto = String(valor ?? "").trim();
  return texto ? texto : null;
}

/**
 * Retorna texto obrigatório já com trim.
 */
function textoObrigatorio(valor: unknown) {
  return String(valor ?? "").trim();
}

/**
 * Normaliza cabeçalhos do CSV:
 * - remove acentos
 * - trim
 * - lowercase
 *
 * Isso ajuda a aceitar arquivos com pequenas variações no cabeçalho.
 */
function normalizarCabecalho(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Snapshot de máquina para auditoria.
 */
function snapshotMaquina(maquina: {
  id: number;
  numero_serie: string;
  setor_id: number;
  usuario_id: number | null;
  tipo_equipamento_id: number | null;
  modelo_id: number | null;
  contrato_id: number | null;
  origem_id: number | null;
  observacoes: string | null;
  esset: string | null;
  termo_responsabilidade: string | null;
  numero_termo_responsabilidade: string | null;
}) {
  return {
    id: maquina.id,
    numero_serie: maquina.numero_serie,
    setor_id: maquina.setor_id,
    usuario_id: maquina.usuario_id,
    tipo_equipamento_id: maquina.tipo_equipamento_id,
    modelo_id: maquina.modelo_id,
    contrato_id: maquina.contrato_id,
    origem_id: maquina.origem_id,
    observacoes: maquina.observacoes,
    esset: maquina.esset,
    termo_responsabilidade: maquina.termo_responsabilidade,
    numero_termo_responsabilidade: maquina.numero_termo_responsabilidade,
  };
}

/**
 * Extrai dados mínimos do autor da importação para auditoria.
 */
function autorAuditoria(logado: {
  id: number;
  nome: string;
  email: string;
  perfil: string;
}) {
  return {
    id: logado.id,
    nome: logado.nome,
    email: logado.email,
  };
}

/**
 * Helpers de "buscar ou criar" para os catálogos auxiliares.
 *
 * Estratégia:
 * - se existir, retorna ID existente
 * - se não existir, cria e retorna o novo ID
 *
 * Isso permite que a importação alimente automaticamente os catálogos.
 */
async function buscarOuCriarSetor(nome: string | null) {
  if (!nome) return null;

  const existente = await prisma.setores.findFirst({
    where: { nome },
  });

  if (existente) return existente.id;

  const criado = await prisma.setores.create({
    data: { nome },
  });

  return criado.id;
}

async function buscarOuCriarUsuario(nome: string | null) {
  if (!nome) return null;

  const existente = await prisma.usuarios.findFirst({
    where: { nome },
  });

  if (existente) return existente.id;

  const criado = await prisma.usuarios.create({
    data: { nome },
  });

  return criado.id;
}

async function buscarOuCriarTipoEquipamento(nome: string | null) {
  if (!nome) return null;

  const existente = await prisma.tipos_equipamento.findFirst({
    where: { nome },
  });

  if (existente) return existente.id;

  const criado = await prisma.tipos_equipamento.create({
    data: { nome },
  });

  return criado.id;
}

async function buscarOuCriarModelo(nome: string | null) {
  if (!nome) return null;

  const existente = await prisma.modelos.findFirst({
    where: { nome },
  });

  if (existente) return existente.id;

  const criado = await prisma.modelos.create({
    data: { nome },
  });

  return criado.id;
}

async function buscarOuCriarContrato(nome: string | null) {
  if (!nome) return null;

  const existente = await prisma.contratos.findFirst({
    where: { nome },
  });

  if (existente) return existente.id;

  const criado = await prisma.contratos.create({
    data: { nome },
  });

  return criado.id;
}

async function buscarOuCriarOrigem(nome: string | null) {
  if (!nome) return null;

  const existente = await prisma.origens.findFirst({
    where: { nome },
  });

  if (existente) return existente.id;

  const criado = await prisma.origens.create({
    data: { nome },
  });

  return criado.id;
}

/**
 * POST /api/maquinas/importar
 *
 * Responsabilidades:
 * - exigir acesso master
 * - receber CSV via multipart/form-data
 * - decodificar e interpretar o arquivo
 * - validar colunas mínimas
 * - criar ou atualizar máquinas
 * - alimentar catálogos auxiliares automaticamente
 * - registrar auditoria das criações e atualizações
 * - devolver resumo da importação
 */
export async function POST(req: Request) {
  try {
    const logado = await exigeMaster();
    const formData = await req.formData();
    const arquivo = formData.get("arquivo");

    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        { erro: "Arquivo CSV é obrigatório." },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await arquivo.arrayBuffer());

    /**
     * Primeiro tenta UTF-8.
     * Se aparecer caractere quebrado, tenta Windows-1252.
     *
     * Isso ajuda bastante com CSV exportado de Excel antigo.
     */
    let conteudo = new TextDecoder("utf-8").decode(bytes);

    if (conteudo.includes("�")) {
      conteudo = new TextDecoder("windows-1252").decode(bytes);
    }

    /**
     * Faz parse do CSV.
     *
     * Regras atuais:
     * - delimitador ;
     * - cabeçalho normalizado
     * - ignora linhas vazias
     */
    const linhas = parse(conteudo, {
      columns: (header: string[]) => header.map(normalizarCabecalho),
      delimiter: ";",
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    }) as LinhaCsv[];

    /**
     * Valida colunas mínimas obrigatórias para processar o arquivo.
     */
    const colunasObrigatorias = ["serial", "setor"];
    const primeiraLinha = linhas[0] ?? {};
    const colunasEncontradas = Object.keys(primeiraLinha);

    const faltando = colunasObrigatorias.filter(
      (coluna) => !colunasEncontradas.includes(coluna)
    );

    if (faltando.length > 0) {
      return NextResponse.json(
        {
          erro: `CSV inválido. Coluna(s) obrigatória(s) não encontrada(s): ${faltando.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    /**
     * Acumulador de resultado final exibido na UI.
     */
    const resultado = {
      total: linhas.length,
      criadas: 0,
      atualizadas: 0,
      ignoradas: 0,
      erros: [] as Array<{ linha: number; erro: string }>,
    };

    /**
     * Processa o CSV linha a linha.
     *
     * index + 2:
     * soma 2 porque index começa em 0 e o CSV tem cabeçalho na linha 1.
     */
    for (let index = 0; index < linhas.length; index++) {
      const linha = linhas[index];

      try {
        const numeroSerie = textoObrigatorio(linha.serial);
        const setorNome = textoObrigatorio(linha.setor);

        if (!numeroSerie) {
          resultado.erros.push({
            linha: index + 2,
            erro: "Número de série é obrigatório.",
          });
          continue;
        }

        if (!setorNome) {
          resultado.erros.push({
            linha: index + 2,
            erro: "Setor é obrigatório.",
          });
          continue;
        }

        /**
         * Resolve ou cria os relacionamentos necessários.
         */
        const setorId = await buscarOuCriarSetor(setorNome);
        const usuarioId = await buscarOuCriarUsuario(textoOuNull(linha.usuario));
        const tipoEquipamentoId = await buscarOuCriarTipoEquipamento(
          textoOuNull(linha.categoria)
        );
        const modeloId = await buscarOuCriarModelo(textoOuNull(linha.modelo));
        const contratoId = await buscarOuCriarContrato(textoOuNull(linha.contrato));
        const origemId = await buscarOuCriarOrigem(textoOuNull(linha.origem));

        /**
         * Payload padronizado que será usado tanto para criação
         * quanto para atualização.
         */
        const payload = {
          numero_serie: numeroSerie,
          setor_id: setorId!,
          usuario_id: usuarioId,
          tipo_equipamento_id: tipoEquipamentoId,
          modelo_id: modeloId,
          contrato_id: contratoId,
          origem_id: origemId,
          observacoes: textoOuNull(linha.descricao),
          esset: textoOuNull(linha.ip_maquina),
          termo_responsabilidade: null,
          numero_termo_responsabilidade: null,
        };

        const existente = await prisma.maquinas.findFirst({
          where: { numero_serie: numeroSerie },
        });

        /**
         * Se não existir máquina com esse número de série,
         * cria um novo registro.
         */
        if (!existente) {
          const criada = await prisma.maquinas.create({
            data: payload,
          });

          await criarLogAuditoria({
            entidade: "maquina",
            entidadeId: criada.id,
            acao: "importacao_criacao",
            funcionario: autorAuditoria(logado),
            descricao: `Importou e criou a máquina ${criada.numero_serie}`,
            antes: null,
            depois: snapshotMaquina(criada),
          });

          resultado.criadas++;
          continue;
        }

        const antes = snapshotMaquina(existente);

        /**
         * Verifica se houve mudança real.
         * Se nada mudou, conta como ignorada.
         */
        const mudou =
          existente.numero_serie !== payload.numero_serie ||
          existente.setor_id !== payload.setor_id ||
          existente.usuario_id !== payload.usuario_id ||
          existente.tipo_equipamento_id !== payload.tipo_equipamento_id ||
          existente.modelo_id !== payload.modelo_id ||
          existente.contrato_id !== payload.contrato_id ||
          existente.origem_id !== payload.origem_id ||
          existente.observacoes !== payload.observacoes ||
          existente.esset !== payload.esset ||
          existente.termo_responsabilidade !== payload.termo_responsabilidade ||
          existente.numero_termo_responsabilidade !==
            payload.numero_termo_responsabilidade;

        if (!mudou) {
          resultado.ignoradas++;
          continue;
        }

        /**
         * Atualiza máquina existente.
         */
        const atualizada = await prisma.maquinas.update({
          where: { id: existente.id },
          data: payload,
        });

        await criarLogAuditoria({
          entidade: "maquina",
          entidadeId: atualizada.id,
          acao: "importacao_atualizacao",
          funcionario: autorAuditoria(logado),
          descricao: `Importou e atualizou a máquina ${atualizada.numero_serie}`,
          antes,
          depois: snapshotMaquina(atualizada),
        });

        resultado.atualizadas++;
      } catch (error) {
        console.error(`Erro na linha ${index + 2}:`, error);
        resultado.erros.push({
          linha: index + 2,
          erro: "Falha ao processar a linha.",
        });
      }
    }

    return NextResponse.json({
      sucesso: true,
      resultado,
      colunasReconhecidas: [
        "serial",
        "criado_em",
        "setor",
        "usuario",
        "empresa_contrato",
        "modelo",
        "categoria",
        "descricao",
        "contrato",
        "ip_maquina",
        "origem",
      ],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SEM_PERMISSAO") {
      return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    }

    console.error("Erro ao importar CSV:", error);
    return NextResponse.json(
      { erro: "Erro interno ao importar CSV." },
      { status: 500 }
    );
  }
}