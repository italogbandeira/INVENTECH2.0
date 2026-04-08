"use client";

import Link from "next/link";
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

function formatarTextoAuditoria(valor: string) {
  const mapa: Record<string, string> = {
    criacao: "Criação",
    edicao: "Edição",
    exclusao: "Exclusão",
    exclusao_em_lote: "Exclusão em lote",
    importacao_criacao: "Importação - criação",
    importacao_atualizacao: "Importação - atualização",
    redefinicao_senha: "Redefinição de senha",
    maquina: "Máquina",
    funcionario: "Funcionário",
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
    new Set([
      ...Object.keys(objAntes ?? {}),
      ...Object.keys(objDepois ?? {}),
    ])
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

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtros, setFiltros] = useState<FiltrosAuditoria>({
    funcionarios: [],
    acoes: [],
    entidades: [],
  });

  const [funcionario, setFuncionario] = useState("");
  const [entidade, setEntidade] = useState("");
  const [acao, setAcao] = useState("");
  const [registro, setRegistro] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  async function carregarFiltros() {
    try {
      const response = await fetch("/api/auditoria/filtros");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.erro || "Erro ao buscar filtros.");
      }

      setFiltros({
        funcionarios: Array.isArray(data?.funcionarios) ? data.funcionarios : [],
        acoes: Array.isArray(data?.acoes) ? data.acoes : [],
        entidades: Array.isArray(data?.entidades) ? data.entidades : [],
      });
    } catch (error) {
      console.error(error);
      setFiltros({
        funcionarios: [],
        acoes: [],
        entidades: [],
      });
    }
  }

  async function carregarAuditoria() {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (funcionario.trim()) params.set("funcionario", funcionario.trim());
      if (entidade.trim()) params.set("entidade", entidade.trim());
      if (acao.trim()) params.set("acao", acao.trim());
      if (registro.trim()) params.set("registro", registro.trim());
      if (dataInicio) params.set("dataInicio", dataInicio);
      if (dataFim) params.set("dataFim", dataFim);

      const response = await fetch(`/api/auditoria?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.erro || "Erro ao buscar auditoria.");
      }

      setLogs(Array.isArray(data?.logs) ? data.logs : []);
    } catch (error) {
      console.error(error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleLimpar() {
    setFuncionario("");
    setEntidade("");
    setAcao("");
    setRegistro("");
    setDataInicio("");
    setDataFim("");
    setLoading(true);

    try {
      const response = await fetch("/api/auditoria");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.erro || "Erro ao buscar auditoria.");
      }

      setLogs(Array.isArray(data?.logs) ? data.logs : []);
    } catch (error) {
      console.error(error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarFiltros();
    carregarAuditoria();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
              className="inline-flex items-center rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
            >
              Voltar
            </Link>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>
            <p className="text-sm text-slate-500">
              Refine o histórico para localizar alterações específicas.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Funcionário
              </label>
              <select
                value={funcionario}
                onChange={(e) => setFuncionario(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2"
              >
                <option value="">Todos</option>
                {filtros.funcionarios.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
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
                onChange={(e) => setEntidade(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2"
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
                onChange={(e) => setAcao(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2"
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
                Registro
              </label>
              <input
                type="number"
                value={registro}
                onChange={(e) => setRegistro(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2"
                placeholder="ID do registro"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Data inicial
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Data final
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={carregarAuditoria}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Filtrar
              </button>

              <button
                onClick={handleLimpar}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Limpar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-900 text-left text-white">
                <tr>
                  <th className="p-4 text-sm font-semibold">Data</th>
                  <th className="p-4 text-sm font-semibold">Funcionário</th>
                  <th className="p-4 text-sm font-semibold">Ação</th>
                  <th className="p-4 text-sm font-semibold">Entidade</th>
                  <th className="p-4 text-sm font-semibold">Registro</th>
                  <th className="p-4 text-sm font-semibold">Descrição</th>
                  <th className="p-4 text-sm font-semibold">Alterações</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-slate-200 align-top odd:bg-white even:bg-slate-50"
                  >
                    <td className="p-4 text-sm text-slate-700">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-4 text-sm text-slate-700">
                      {log.funcionarioNome ?? "-"}
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-900">
                      {formatarTextoAuditoria(log.acao)}
                    </td>
                    <td className="p-4 text-sm text-slate-700">
                      {formatarTextoAuditoria(log.entidade)}
                    </td>
                    <td className="p-4 text-sm text-slate-700">
                      {log.entidadeId ?? "-"}
                    </td>
                    <td className="p-4 text-sm text-slate-700">
                      {log.descricao ?? "-"}
                    </td>
                    <td className="p-4 text-xs text-slate-700">
                      {renderizarAlteracoes(log.antes, log.depois)}
                    </td>
                  </tr>
                ))}

                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center">
                      <div className="text-sm font-medium text-slate-700">
                        Nenhum histórico encontrado.
                      </div>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-sm text-slate-500">
                      Carregando auditoria...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}