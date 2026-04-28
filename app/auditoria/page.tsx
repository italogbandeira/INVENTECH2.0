"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

type LogAuditoria = {
  id: number;
  entidade: string;
  entidadeId: number | null;
  acao: string;
  funcionarioId: number | null;
  funcionarioNome: string | null;
  descricao: string | null;
  antes: string | null;
  depois: string | null;
  createdAt: string;
};

type FiltrosAuditoria = {
  funcionarios: string[];
  acoes: string[];
  entidades: string[];
};

type FuncionarioLogado = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
};

type FiltrosRequisicao = {
  funcionario: string;
  entidade: string;
  acao: string;
  registro: string;
  busca: string;
  dataInicio: string;
  dataFim: string;
};

function formatarTextoAuditoria(valor: string) {
  const mapa: Record<string, string> = {
    criacao: "Criação",
    edicao: "Edição",
    exclusao: "Exclusão",
    exclusao_em_lote: "Exclusão em lote",
    importacao_criacao: "Importação - criação",
    importacao_atualizacao: "Importação - atualização",
    redefinicao_senha: "Redefinição de senha",
    inativacao: "Inativação",
    maquina: "Máquina",
    funcionario: "Funcionário",
    usuario: "Usuário",
  };

  if (mapa[valor]) return mapa[valor];

  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function formatarCampo(campo: string) {
  const mapa: Record<string, string> = {
    id: "ID",
    numero_serie: "Número de série",
    setor_id: "Setor",
    usuario_id: "Usuário",
    tipo_equipamento_id: "Tipo de equipamento",
    modelo_id: "Modelo",
    contrato_id: "Contrato",
    origem_id: "Origem",
    observacoes: "Observações",
    esset: "ESSET",
    termo_responsabilidade: "Termo de responsabilidade",
    numero_termo_responsabilidade: "Número do termo de responsabilidade",
    nome: "Nome",
    email: "E-mail",
    perfil: "Perfil",
    ativo: "Ativo",
    senha: "Senha",
  };

  if (mapa[campo]) return mapa[campo];

  return campo
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function formatarValor(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return "-";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return String(valor);
}

function tentarParseJson(texto: string | null) {
  if (!texto) return null;

  try {
    return JSON.parse(texto) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function renderizarAlteracoes(antes: string | null, depois: string | null) {
  const objAntes = tentarParseJson(antes);
  const objDepois = tentarParseJson(depois);

  if (!objAntes && !objDepois) {
    return <span>-</span>;
  }

  const chaves = Array.from(
    new Set([...Object.keys(objAntes ?? {}), ...Object.keys(objDepois ?? {})])
  );

  const diferencas = chaves.filter((chave) => {
    const valorAntes = objAntes?.[chave];
    const valorDepois = objDepois?.[chave];

    return JSON.stringify(valorAntes) !== JSON.stringify(valorDepois);
  });

  if (diferencas.length === 0) {
    return <span>-</span>;
  }

  return (
    <div className="space-y-1">
      {diferencas.map((chave) => (
        <div key={chave} className="leading-5">
          <span className="font-semibold">{formatarCampo(chave)}:</span>{" "}
          <span>{formatarValor(objAntes?.[chave])}</span>
          <span className="mx-1 text-slate-400">→</span>
          <span>{formatarValor(objDepois?.[chave])}</span>
        </div>
      ))}
    </div>
  );
}

function formatarData(data: string) {
  const date = new Date(data);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("pt-BR");
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroTela, setErroTela] = useState("");

  const [filtros, setFiltros] = useState<FiltrosAuditoria>({
    funcionarios: [],
    acoes: [],
    entidades: [],
  });

  const [funcionarioLogado, setFuncionarioLogado] =
    useState<FuncionarioLogado | null>(null);

  const [funcionario, setFuncionario] = useState("");
  const [entidade, setEntidade] = useState("");
  const [acao, setAcao] = useState("");
  const [registro, setRegistro] = useState("");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [idsSelecionados, setIdsSelecionados] = useState<number[]>([]);
  const [selecionouTudoFiltro, setSelecionouTudoFiltro] = useState(false);
  const [limpandoAuditoria, setLimpandoAuditoria] = useState(false);

  const ehMaster = funcionarioLogado?.perfil === "master";

  function filtrosAtuais(): FiltrosRequisicao {
    return {
      funcionario,
      entidade,
      acao,
      registro,
      busca,
      dataInicio,
      dataFim,
    };
  }

  function montarParams(
    pageToLoad: number,
    limitToLoad: number,
    filtrosReq: FiltrosRequisicao
  ) {
    const params = new URLSearchParams();

    if (filtrosReq.funcionario.trim()) {
      params.set("funcionario", filtrosReq.funcionario.trim());
    }

    if (filtrosReq.entidade.trim()) {
      params.set("entidade", filtrosReq.entidade.trim());
    }

    if (filtrosReq.acao.trim()) {
      params.set("acao", filtrosReq.acao.trim());
    }

    if (filtrosReq.registro.trim()) {
      params.set("registro", filtrosReq.registro.trim());
    }

    if (filtrosReq.busca.trim()) {
      params.set("busca", filtrosReq.busca.trim());
    }

    if (filtrosReq.dataInicio) {
      params.set("dataInicio", filtrosReq.dataInicio);
    }

    if (filtrosReq.dataFim) {
      params.set("dataFim", filtrosReq.dataFim);
    }

    params.set("page", String(pageToLoad));
    params.set("limit", String(limitToLoad));

    return params;
  }

  function limparSelecao() {
    setIdsSelecionados([]);
    setSelecionouTudoFiltro(false);
  }

  async function carregarFuncionarioLogado() {
    try {
      const response = await fetch("/api/me");

      if (!response.ok) {
        setFuncionarioLogado(null);
        return;
      }

      const data = await response.json();

      setFuncionarioLogado(data.usuario ?? data.funcionario ?? null);
    } catch (error) {
      console.error("Erro ao carregar funcionário logado:", error);
      setFuncionarioLogado(null);
    }
  }

  async function carregarFiltros() {
    try {
      const response = await fetch("/api/auditoria/filtros");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.erro || "Erro ao buscar filtros.");
      }

      setFiltros({
        funcionarios: Array.isArray(data?.funcionarios)
          ? data.funcionarios
          : [],
        acoes: Array.isArray(data?.acoes) ? data.acoes : [],
        entidades: Array.isArray(data?.entidades) ? data.entidades : [],
      });
    } catch (error) {
      console.error("Erro ao carregar filtros:", error);

      setFiltros({
        funcionarios: [],
        acoes: [],
        entidades: [],
      });
    }
  }

  async function carregarAuditoria(
    pageToLoad = page,
    limitToLoad = limit,
    filtrosReq = filtrosAtuais()
  ) {
    setLoading(true);
    setErroTela("");
    limparSelecao();

    try {
      const params = montarParams(pageToLoad, limitToLoad, filtrosReq);

      const response = await fetch(`/api/auditoria?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.erro || "Erro ao buscar auditoria.");
      }

      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      setTotal(Number(data?.total ?? 0));
      setTotalPages(Number(data?.totalPages ?? 1));
      setPage(Number(data?.page ?? pageToLoad));
      setLimit(Number(data?.limit ?? limitToLoad));
    } catch (error) {
      console.error("Erro ao buscar auditoria:", error);

      setLogs([]);
      setTotal(0);
      setTotalPages(1);

      setErroTela(
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao buscar auditoria."
      );
    } finally {
      setLoading(false);
    }
  }

  async function iniciarPagina() {
    await Promise.all([carregarFuncionarioLogado(), carregarFiltros()]);
    await carregarAuditoria(1, limit);
  }

  useEffect(() => {
    void iniciarPagina();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiltrar(event: FormEvent) {
    event.preventDefault();

    await carregarAuditoria(1, limit, filtrosAtuais());
  }

  async function handleLimpar() {
    const filtrosLimpos: FiltrosRequisicao = {
      funcionario: "",
      entidade: "",
      acao: "",
      registro: "",
      busca: "",
      dataInicio: "",
      dataFim: "",
    };

    setFuncionario("");
    setEntidade("");
    setAcao("");
    setRegistro("");
    setBusca("");
    setDataInicio("");
    setDataFim("");

    await carregarAuditoria(1, limit, filtrosLimpos);
  }

  async function trocarPagina(novaPagina: number) {
    if (novaPagina < 1 || novaPagina > totalPages || loading) return;

    await carregarAuditoria(novaPagina, limit);
  }

  async function trocarLimite(novoLimite: number) {
    await carregarAuditoria(1, novoLimite);
  }

  function alternarSelecionado(id: number) {
    setSelecionouTudoFiltro(false);

    setIdsSelecionados((atuais) =>
      atuais.includes(id)
        ? atuais.filter((item) => item !== id)
        : [...atuais, id]
    );
  }

  function alternarTodosDaPagina() {
    setSelecionouTudoFiltro(false);

    const idsDaPagina = logs.map((log) => log.id);

    const todosSelecionados =
      idsDaPagina.length > 0 &&
      idsDaPagina.every((id) => idsSelecionados.includes(id));

    if (todosSelecionados) {
      setIdsSelecionados((atuais) =>
        atuais.filter((id) => !idsDaPagina.includes(id))
      );
    } else {
      setIdsSelecionados((atuais) =>
        Array.from(new Set([...atuais, ...idsDaPagina]))
      );
    }
  }

  function selecionarTudoDoFiltro() {
    if (total === 0) return;

    setIdsSelecionados([]);
    setSelecionouTudoFiltro(true);

    alert(
      `Todos os ${total} registro(s) encontrados pelo filtro atual foram selecionados.`
    );
  }

  async function limparAuditoria(modo: "selecionados" | "filtro") {
  if (!ehMaster) {
    alert("Apenas usuários master podem limpar auditoria.");
    return;
  }

  if (modo === "selecionados" && idsSelecionados.length === 0) {
    alert("Selecione pelo menos um registro de auditoria.");
    return;
  }

  if (modo === "filtro" && total === 0) {
    alert("Não há registros no filtro atual.");
    return;
  }

  const mensagem =
    modo === "filtro"
      ? `Você está prestes a apagar TODOS os ${total} registro(s) encontrados pelo filtro atual.\n\nEssa ação não pode ser desfeita.\n\nPara confirmar, digite: deletar`
      : `Você está prestes a apagar ${idsSelecionados.length} registro(s) selecionado(s) da auditoria.\n\nEssa ação não pode ser desfeita.\n\nPara confirmar, digite: deletar`;

  const confirmacaoDigitada = window.prompt(mensagem);

  if (confirmacaoDigitada === null) {
    return;
  }

  if (confirmacaoDigitada.trim().toLowerCase() !== "deletar") {
    alert('Confirmação inválida. Para apagar, você precisa digitar "deletar".');
    return;
  }

  setLimpandoAuditoria(true);

  try {
    const response = await fetch("/api/auditoria", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        modo === "filtro"
          ? {
              modo: "filtro",
              confirmacao: confirmacaoDigitada,
              filtros: filtrosAtuais(),
            }
          : {
              modo: "selecionados",
              ids: idsSelecionados,
              confirmacao: confirmacaoDigitada,
            }
      ),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.erro || data?.detalhe || "Erro ao limpar auditoria."
      );
    }

    alert(
      `Auditoria limpa com sucesso.\n\nRegistros removidos: ${
        data?.removidos ?? 0
      }`
    );

    limparSelecao();

    await carregarFiltros();
    await carregarAuditoria(1, limit);
  } catch (error) {
    console.error("Erro ao limpar auditoria:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Erro desconhecido ao limpar auditoria."
    );
  } finally {
    setLimpandoAuditoria(false);
  }
}

  const todosDaPaginaSelecionados =
    logs.length > 0 &&
    logs.every((log) => idsSelecionados.includes(log.id));

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Auditoria
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Histórico de quem alterou o sistema e o que foi modificado.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Voltar
            </Link>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>

            <p className="mt-1 text-sm text-slate-500">
              Refine o histórico para localizar alterações específicas.
            </p>
          </div>

          <form onSubmit={handleFiltrar} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Funcionário
                </label>

                <select
                  value={funcionario}
                  onChange={(event) => setFuncionario(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-blue-500"
                >
                  <option value="">Todos</option>

                  {filtros.funcionarios.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Entidade
                </label>

                <select
                  value={entidade}
                  onChange={(event) => setEntidade(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-blue-500"
                >
                  <option value="">Todas</option>

                  {filtros.entidades.map((item) => (
                    <option key={item} value={item}>
                      {formatarTextoAuditoria(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Ação
                </label>

                <select
                  value={acao}
                  onChange={(event) => setAcao(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-blue-500"
                >
                  <option value="">Todas</option>

                  {filtros.acoes.map((item) => (
                    <option key={item} value={item}>
                      {formatarTextoAuditoria(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  ID do registro
                </label>

                <input
                  type="number"
                  value={registro}
                  onChange={(event) => setRegistro(event.target.value)}
                  placeholder="Ex.: 1"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Busca geral
                </label>

                <input
                  type="text"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Nome do usuário, número de série, contrato, descrição..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Data inicial
                </label>

                <input
                  type="date"
                  value={dataInicio}
                  onChange={(event) => setDataInicio(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Data final
                </label>

                <input
                  type="date"
                  value={dataFim}
                  onChange={(event) => setDataFim(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={loading || limpandoAuditoria}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Filtrar
                </button>

                <button
                  type="button"
                  onClick={handleLimpar}
                  disabled={loading || limpandoAuditoria}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Limpar
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-700">Por página</span>

                <select
                  value={limit}
                  onChange={(event) => {
                    void trocarLimite(Number(event.target.value));
                  }}
                  disabled={loading || limpandoAuditoria}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </form>
        </section>

        {erroTela && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {erroTela}
          </section>
        )}

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-700">
              <strong>{total}</strong> registro(s) encontrado(s) • Página{" "}
              <strong>{page}</strong> de <strong>{totalPages}</strong>
              {ehMaster && (
                <div className="mt-1 text-xs text-slate-500">
                  {selecionouTudoFiltro
                    ? `Todos os ${total} registro(s) do filtro atual estão selecionados.`
                    : `${idsSelecionados.length} registro(s) selecionado(s).`}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {ehMaster && (
                <>
                  <button
                    type="button"
                    onClick={alternarTodosDaPagina}
                    disabled={
                      loading || limpandoAuditoria || logs.length === 0
                    }
                    className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {todosDaPaginaSelecionados
                      ? "Desmarcar página"
                      : "Selecionar página"}
                  </button>

                  <button
                    type="button"
                    onClick={selecionarTudoDoFiltro}
                    disabled={loading || limpandoAuditoria || total === 0}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Selecionar tudo do filtro
                  </button>

                  <button
                    type="button"
                    onClick={() => void limparAuditoria("selecionados")}
                    disabled={
                      loading ||
                      limpandoAuditoria ||
                      idsSelecionados.length === 0 ||
                      selecionouTudoFiltro
                    }
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Limpar selecionados
                  </button>

                  <button
                    type="button"
                    onClick={() => void limparAuditoria("filtro")}
                    disabled={loading || limpandoAuditoria || total === 0}
                    className="rounded-xl bg-red-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Limpar tudo do filtro
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => void trocarPagina(page - 1)}
                disabled={loading || limpandoAuditoria || page <= 1}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={() => void trocarPagina(page + 1)}
                disabled={loading || limpandoAuditoria || page >= totalPages}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Próxima
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950 text-white">
                <tr>
                  {ehMaster && (
                    <th className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={todosDaPaginaSelecionados}
                        onChange={alternarTodosDaPagina}
                        disabled={
                          loading || limpandoAuditoria || logs.length === 0
                        }
                        className="h-4 w-4"
                      />
                    </th>
                  )}

                  <th className="px-4 py-4">Data</th>
                  <th className="px-4 py-4">Funcionário</th>
                  <th className="px-4 py-4">Ação</th>
                  <th className="px-4 py-4">Entidade</th>
                  <th className="px-4 py-4">ID</th>
                  <th className="px-4 py-4">Descrição</th>
                  <th className="px-4 py-4">Alterações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={ehMaster ? 8 : 7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Carregando auditoria...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={ehMaster ? 8 : 7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 align-top hover:bg-slate-50"
                    >
                      {ehMaster && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={
                              selecionouTudoFiltro ||
                              idsSelecionados.includes(log.id)
                            }
                            onChange={() => alternarSelecionado(log.id)}
                            disabled={limpandoAuditoria}
                            className="h-4 w-4"
                          />
                        </td>
                      )}

                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {formatarData(log.createdAt)}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {log.funcionarioNome ?? "-"}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {formatarTextoAuditoria(log.acao)}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {formatarTextoAuditoria(log.entidade)}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {log.entidadeId ?? "-"}
                      </td>

                      <td className="max-w-sm px-4 py-4 text-slate-700">
                        {log.descricao ?? "-"}
                      </td>

                      <td className="min-w-[280px] px-4 py-4 text-xs text-slate-700">
                        {renderizarAlteracoes(log.antes, log.depois)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}