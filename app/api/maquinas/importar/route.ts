export const runtime = "nodejs";
export const maxDuration = 60;

import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { exigeLogin } from "@/lib/auth";

type RegistroImportacao = Record<string, string>;

type RegistroComLinha = {
  linha: number;
  dados: RegistroImportacao;
};

type ResultadoLeitura = {
  tipo: "csv" | "xlsx";
  headers: string[];
  registros: RegistroComLinha[];
};

type UsuarioExistente = {
  id: number;
  nome: string;
  login_email: string | null;
  login_maquina: string | null;
};

const ALIASES_HEADERS: Record<string, string> = {
  id: "id",

  numero_serie: "numero_serie",
  numero_de_serie: "numero_serie",
  numero_serial: "numero_serie",
  numero_do_serial: "numero_serie",
  n_serie: "numero_serie",
  n_de_serie: "numero_serie",
  serial: "numero_serie",
  serie: "numero_serie",
  patrimonio: "numero_serie",
  patrimonial: "numero_serie",

  setor: "setor",

  usuario: "usuario",
  nome_usuario: "usuario",
  nome_do_usuario: "usuario",
  colaborador: "usuario",
  funcionario: "usuario",
  nome_funcionario: "usuario",
  nome_do_funcionario: "usuario",

  usuario_id: "usuario_id",
  id_usuario: "usuario_id",
  id_do_usuario: "usuario_id",
  codigo_usuario: "usuario_id",
  cod_usuario: "usuario_id",

  login_email: "login_email",
  email: "login_email",
  e_mail: "login_email",
  login: "login_email",
  email_usuario: "login_email",
  login_do_email: "login_email",

  login_maquina: "login_maquina",
  login_da_maquina: "login_maquina",
  usuario_maquina: "login_maquina",
  user_maquina: "login_maquina",
  login_rede: "login_maquina",
  login_de_rede: "login_maquina",

  tipo: "tipo_equipamento",
  tipo_equipamento: "tipo_equipamento",
  tipo_de_equipamento: "tipo_equipamento",
  equipamento: "tipo_equipamento",
  categoria: "tipo_equipamento",

  modelo: "modelo",
  contrato: "contrato",
  origem: "origem",

  observacao: "observacoes",
  observacoes: "observacoes",
  descricao: "observacoes",
  descricoes: "observacoes",

  esset: "esset",
  asset: "esset",
  ativo: "esset",

  termo_responsabilidade: "termo_responsabilidade",
  termo_de_responsabilidade: "termo_responsabilidade",
  tr: "termo_responsabilidade",

  numero_termo_responsabilidade: "numero_termo_responsabilidade",
  numero_do_termo_responsabilidade: "numero_termo_responsabilidade",
  numero_do_termo: "numero_termo_responsabilidade",
  numero_termo: "numero_termo_responsabilidade",
  n_termo: "numero_termo_responsabilidade",
};

function normalizarTexto(valor: unknown): string {
  const texto = String(valor ?? "")
    .replace(/\u00A0/g, " ")
    .trim();

  const normalizado = texto.toLowerCase();

  const valoresVazios = [
    "",
    "-",
    "--",
    "---",
    "null",
    "nulo",
    "undefined",
    "n/a",
    "na",
    "não informado",
    "nao informado",
    "não se aplica",
    "nao se aplica",
    "sem informação",
    "sem informacao",
  ];

  if (valoresVazios.includes(normalizado)) {
    return "";
  }

  return texto;
}

function normalizarPessoa(valor: unknown): string {
  return normalizarTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/[^\w\s.@-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ehUsuarioLivre(valor: unknown): boolean {
  const texto = normalizarPessoa(valor);

  return [
    "",
    "livre",
    "maquina livre",
    "maquinas livres",
    "sem usuario",
    "sem usuario vinculado",
    "sem colaborador",
    "sem funcionario",
    "disponivel",
    "estoque",
  ].includes(texto);
}

function normalizarHeader(valor: unknown): string {
  const chave = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return ALIASES_HEADERS[chave] ?? chave;
}

function vazioParaNull(valor: string): string | null {
  const limpo = normalizarTexto(valor);
  return limpo.length > 0 ? limpo : null;
}

function detectarDelimitador(texto: string): string {
  const primeiraLinha =
    texto.split(/\r?\n/).find((linha) => linha.trim().length > 0) ?? "";

  const qtdPontoVirgula = (primeiraLinha.match(/;/g) ?? []).length;
  const qtdVirgula = (primeiraLinha.match(/,/g) ?? []).length;
  const qtdTab = (primeiraLinha.match(/\t/g) ?? []).length;

  if (qtdPontoVirgula >= qtdVirgula && qtdPontoVirgula >= qtdTab) {
    return ";";
  }

  if (qtdTab >= qtdVirgula) {
    return "\t";
  }

  return ",";
}

function decodificarTextoCsv(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function arquivoEhXlsx(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

function arquivoEhXlsAntigo(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  );
}

function lerCsv(bytes: Uint8Array): ResultadoLeitura {
  const textoCsv = decodificarTextoCsv(bytes);
  const delimitador = detectarDelimitador(textoCsv);

  const registros = parse(textoCsv, {
    columns: (headers: string[]) =>
      headers.map((header) => normalizarHeader(header)),
    bom: true,
    delimiter: delimitador,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as RegistroImportacao[];

  const headers = registros.length > 0 ? Object.keys(registros[0]) : [];

  return {
    tipo: "csv",
    headers,
    registros: registros.map((dados, index) => ({
      linha: index + 2,
      dados,
    })),
  };
}

function valorCelulaExcel(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) {
    return "";
  }

  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }

  if (typeof valor === "object") {
    const objeto = valor as {
      text?: string;
      richText?: { text: string }[];
      result?: unknown;
      formula?: string;
      hyperlink?: string;
    };

    if (Array.isArray(objeto.richText)) {
      return objeto.richText.map((parte) => parte.text).join("");
    }

    if (objeto.text !== undefined) {
      return String(objeto.text);
    }

    if (objeto.result !== undefined) {
      return String(objeto.result);
    }

    if (objeto.formula !== undefined) {
      return String(objeto.result ?? "");
    }
  }

  return String(valor);
}

async function lerXlsx(bytes: Uint8Array): Promise<ResultadoLeitura> {
  const workbook = new ExcelJS.Workbook();

  const bufferXlsx = Buffer.from(bytes) as unknown as Parameters<
    typeof workbook.xlsx.load
  >[0];

  await workbook.xlsx.load(bufferXlsx);

  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return {
      tipo: "xlsx",
      headers: [],
      registros: [],
    };
  }

  const primeiraLinha = sheet.getRow(1);
  const headers: string[] = [];

  primeiraLinha.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = normalizarHeader(valorCelulaExcel(cell.value));
  });

  const registros: RegistroComLinha[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const dados: RegistroImportacao = {};

    headers.forEach((header, index) => {
      if (!header) return;

      dados[header] = normalizarTexto(
        valorCelulaExcel(row.getCell(index + 1).value)
      );
    });

    const temAlgumValor = Object.values(dados).some(
      (valor) => normalizarTexto(valor).length > 0
    );

    if (temAlgumValor) {
      registros.push({
        linha: rowNumber,
        dados,
      });
    }
  }

  return {
    tipo: "xlsx",
    headers,
    registros,
  };
}

function campo(registro: RegistroImportacao, nome: string): string {
  return normalizarTexto(registro[nome]);
}

async function obterIdSetor(nome: string, cache: Map<string, number>) {
  const nomeLimpo = normalizarTexto(nome) || "Sem setor";

  if (cache.has(nomeLimpo)) {
    return cache.get(nomeLimpo)!;
  }

  const item = await prisma.setores.upsert({
    where: { nome: nomeLimpo },
    update: {},
    create: { nome: nomeLimpo },
    select: { id: true },
  });

  cache.set(nomeLimpo, item.id);
  return item.id;
}

async function obterIdTipoEquipamento(nome: string, cache: Map<string, number>) {
  const nomeLimpo = normalizarTexto(nome);

  if (!nomeLimpo) return null;

  if (cache.has(nomeLimpo)) {
    return cache.get(nomeLimpo)!;
  }

  const item = await prisma.tipos_equipamento.upsert({
    where: { nome: nomeLimpo },
    update: {},
    create: { nome: nomeLimpo },
    select: { id: true },
  });

  cache.set(nomeLimpo, item.id);
  return item.id;
}

async function obterIdModelo(nome: string, cache: Map<string, number>) {
  const nomeLimpo = normalizarTexto(nome);

  if (!nomeLimpo) return null;

  if (cache.has(nomeLimpo)) {
    return cache.get(nomeLimpo)!;
  }

  const item = await prisma.modelos.upsert({
    where: { nome: nomeLimpo },
    update: {},
    create: { nome: nomeLimpo },
    select: { id: true },
  });

  cache.set(nomeLimpo, item.id);
  return item.id;
}

async function obterIdContrato(nome: string, cache: Map<string, number>) {
  const nomeLimpo = normalizarTexto(nome);

  if (!nomeLimpo) return null;

  if (cache.has(nomeLimpo)) {
    return cache.get(nomeLimpo)!;
  }

  const item = await prisma.contratos.upsert({
    where: { nome: nomeLimpo },
    update: {},
    create: { nome: nomeLimpo },
    select: { id: true },
  });

  cache.set(nomeLimpo, item.id);
  return item.id;
}

async function obterIdOrigem(nome: string, cache: Map<string, number>) {
  const nomeLimpo = normalizarTexto(nome);

  if (!nomeLimpo) return null;

  if (cache.has(nomeLimpo)) {
    return cache.get(nomeLimpo)!;
  }

  const item = await prisma.origens.upsert({
    where: { nome: nomeLimpo },
    update: {},
    create: { nome: nomeLimpo },
    select: { id: true },
  });

  cache.set(nomeLimpo, item.id);
  return item.id;
}

async function obterIdUsuario(
  usuarioIdTexto: string,
  nome: string,
  loginEmail: string,
  loginMaquina: string,
  cache: Map<string, number>,
  usuariosExistentes: UsuarioExistente[]
) {
  const usuarioId = Number(usuarioIdTexto);

  if (Number.isInteger(usuarioId) && usuarioId > 0) {
    const usuarioPorId = usuariosExistentes.find(
      (usuario) => usuario.id === usuarioId
    );

    if (usuarioPorId) {
      return usuarioPorId.id;
    }
  }

  const nomeLimpo = ehUsuarioLivre(nome) ? "" : normalizarTexto(nome);
  const emailLimpo = ehUsuarioLivre(loginEmail)
    ? ""
    : normalizarTexto(loginEmail);
  const loginMaquinaLimpo = ehUsuarioLivre(loginMaquina)
    ? ""
    : normalizarTexto(loginMaquina);

  if (!nomeLimpo && !emailLimpo && !loginMaquinaLimpo) {
    return null;
  }

  const nomeNormalizado = normalizarPessoa(nomeLimpo);
  const emailNormalizado = normalizarPessoa(emailLimpo);
  const loginMaquinaNormalizado = normalizarPessoa(loginMaquinaLimpo);

  const chave = `${usuarioId || ""}|${nomeNormalizado}|${emailNormalizado}|${loginMaquinaNormalizado}`;

  if (cache.has(chave)) {
    return cache.get(chave)!;
  }

  const candidatos = usuariosExistentes
    .map((usuario) => {
      const nomeUsuario = normalizarPessoa(usuario.nome);
      const emailUsuario = normalizarPessoa(usuario.login_email);
      const loginMaquinaUsuario = normalizarPessoa(usuario.login_maquina);

      let pontuacao = 0;

      if (emailNormalizado && emailUsuario === emailNormalizado) {
        pontuacao += 100;
      }

      if (
        loginMaquinaNormalizado &&
        loginMaquinaUsuario === loginMaquinaNormalizado
      ) {
        pontuacao += 100;
      }

      if (nomeNormalizado && nomeUsuario === nomeNormalizado) {
        pontuacao += 70;
      }

      if (normalizarTexto(usuario.login_email)) {
        pontuacao += 10;
      }

      if (normalizarTexto(usuario.login_maquina)) {
        pontuacao += 10;
      }

      return {
        usuario,
        pontuacao,
      };
    })
    .filter((item) => item.pontuacao >= 70)
    .sort((a, b) => {
      if (b.pontuacao !== a.pontuacao) {
        return b.pontuacao - a.pontuacao;
      }

      return a.usuario.id - b.usuario.id;
    });

  const melhorCandidato = candidatos[0]?.usuario;

  if (melhorCandidato) {
    const dadosAtualizacao: {
      nome?: string;
      login_email?: string | null;
      login_maquina?: string | null;
    } = {};

    if (!normalizarTexto(melhorCandidato.nome) && nomeLimpo) {
      dadosAtualizacao.nome = nomeLimpo;
      melhorCandidato.nome = nomeLimpo;
    }

    if (!normalizarTexto(melhorCandidato.login_email) && emailLimpo) {
      dadosAtualizacao.login_email = emailLimpo;
      melhorCandidato.login_email = emailLimpo;
    }

    if (!normalizarTexto(melhorCandidato.login_maquina) && loginMaquinaLimpo) {
      dadosAtualizacao.login_maquina = loginMaquinaLimpo;
      melhorCandidato.login_maquina = loginMaquinaLimpo;
    }

    if (Object.keys(dadosAtualizacao).length > 0) {
      await prisma.usuarios.update({
        where: { id: melhorCandidato.id },
        data: dadosAtualizacao,
      });
    }

    cache.set(chave, melhorCandidato.id);
    return melhorCandidato.id;
  }

  const novoUsuario = await prisma.usuarios.create({
    data: {
      nome: nomeLimpo || emailLimpo || loginMaquinaLimpo || "Usuário sem nome",
      login_email: emailLimpo || null,
      login_maquina: loginMaquinaLimpo || null,
    },
    select: {
      id: true,
      nome: true,
      login_email: true,
      login_maquina: true,
    },
  });

  usuariosExistentes.push(novoUsuario);

  cache.set(chave, novoUsuario.id);
  return novoUsuario.id;
}

export async function POST(req: Request) {
  try {
    await exigeLogin();

    const formData = await req.formData();

    const entradaArquivo =
      formData.get("arquivo") ?? formData.get("file") ?? formData.get("csv");

    if (
      !entradaArquivo ||
      typeof entradaArquivo === "string" ||
      typeof entradaArquivo.arrayBuffer !== "function"
    ) {
      return NextResponse.json(
        { erro: "Nenhum arquivo foi enviado." },
        { status: 400 }
      );
    }

    const arquivo = entradaArquivo as File;
    const bytes = new Uint8Array(await arquivo.arrayBuffer());

    if (bytes.length === 0) {
      return NextResponse.json(
        { erro: "O arquivo enviado está vazio." },
        { status: 400 }
      );
    }

    if (arquivoEhXlsAntigo(bytes)) {
      return NextResponse.json(
        {
          erro:
            "Arquivo .xls antigo não é suportado. Salve como CSV UTF-8 ou como .xlsx e tente novamente.",
        },
        { status: 400 }
      );
    }

    const leitura = arquivoEhXlsx(bytes) ? await lerXlsx(bytes) : lerCsv(bytes);

    if (leitura.registros.length === 0) {
      return NextResponse.json(
        {
          erro:
            "Nenhuma linha válida foi encontrada no arquivo. Verifique se a primeira linha contém os cabeçalhos.",
        },
        { status: 400 }
      );
    }

    if (!leitura.headers.includes("numero_serie")) {
      return NextResponse.json(
        {
          erro:
            "A coluna de número de série não foi encontrada. Use um cabeçalho como: Número de Série, numero_serie, serial ou patrimônio.",
          headersEncontrados: leitura.headers,
        },
        { status: 400 }
      );
    }

    const usuariosExistentes = await prisma.usuarios.findMany({
      select: {
        id: true,
        nome: true,
        login_email: true,
        login_maquina: true,
      },
    });

    const cacheSetores = new Map<string, number>();
    const cacheUsuarios = new Map<string, number>();
    const cacheTipos = new Map<string, number>();
    const cacheModelos = new Map<string, number>();
    const cacheContratos = new Map<string, number>();
    const cacheOrigens = new Map<string, number>();

    let criados = 0;
    let atualizados = 0;

    const ignorados: { linha: number; motivo: string }[] = [];

    for (const item of leitura.registros) {
      const registro = item.dados;

      const numeroSerie = campo(registro, "numero_serie");

      if (!numeroSerie) {
        ignorados.push({
          linha: item.linha,
          motivo: "Número de série vazio.",
        });
        continue;
      }

      const setorNome = campo(registro, "setor") || "Sem setor";
      const usuarioIdTexto = campo(registro, "usuario_id");
      const usuarioNome = campo(registro, "usuario");
      const loginEmail = campo(registro, "login_email");
      const loginMaquina = campo(registro, "login_maquina");
      const tipoNome = campo(registro, "tipo_equipamento");
      const modeloNome = campo(registro, "modelo");
      const contratoNome = campo(registro, "contrato");
      const origemNome = campo(registro, "origem");

      const setorId = await obterIdSetor(setorNome, cacheSetores);

      const usuarioId = await obterIdUsuario(
        usuarioIdTexto,
        usuarioNome,
        loginEmail,
        loginMaquina,
        cacheUsuarios,
        usuariosExistentes
      );

      const tipoEquipamentoId = await obterIdTipoEquipamento(
        tipoNome,
        cacheTipos
      );

      const modeloId = await obterIdModelo(modeloNome, cacheModelos);
      const contratoId = await obterIdContrato(contratoNome, cacheContratos);
      const origemId = await obterIdOrigem(origemNome, cacheOrigens);

      const dadosMaquina = {
        setor_id: setorId,
        usuario_id: usuarioId,
        tipo_equipamento_id: tipoEquipamentoId,
        modelo_id: modeloId,
        contrato_id: contratoId,
        origem_id: origemId,
        observacoes: vazioParaNull(campo(registro, "observacoes")),
        esset: vazioParaNull(campo(registro, "esset")),
        termo_responsabilidade: vazioParaNull(
          campo(registro, "termo_responsabilidade")
        ),
        numero_termo_responsabilidade: vazioParaNull(
          campo(registro, "numero_termo_responsabilidade")
        ),
      };

      const maquinaExistente = await prisma.maquinas.findUnique({
        where: { numero_serie: numeroSerie },
        select: { id: true },
      });

      if (maquinaExistente) {
        await prisma.maquinas.update({
          where: { id: maquinaExistente.id },
          data: dadosMaquina,
        });

        atualizados++;
      } else {
        await prisma.maquinas.create({
          data: {
            numero_serie: numeroSerie,
            ...dadosMaquina,
          },
        });

        criados++;
      }
    }

    return NextResponse.json({
      mensagem: "Importação concluída.",
      tipoArquivo: leitura.tipo,
      totalLinhasLidas: leitura.registros.length,
      criados,
      atualizados,
      ignorados: ignorados.length,
      detalhesIgnorados: ignorados.slice(0, 50),
    });
  } catch (error) {
    console.error("Erro ao importar arquivo:", error);

    const mensagem =
      error instanceof Error
        ? error.message
        : "Erro desconhecido ao importar arquivo.";

    return NextResponse.json(
      {
        erro: "Erro interno ao importar arquivo.",
        detalhe: mensagem,
      },
      { status: 500 }
    );
  }
}