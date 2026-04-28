"use client";

import { useState } from "react";
import Link from "next/link";

type ResultadoImportacao = {
  total: number;
  criadas: number;
  atualizadas: number;
  ignoradas: number;
  erros: Array<{
    linha: number;
    erro: string;
  }>;
};

type RespostaApiImportacao = {
  mensagem?: string;
  tipoArquivo?: "csv" | "xlsx";
  totalLinhasLidas?: number;
  criados?: number;
  atualizados?: number;
  ignorados?: number;
  detalhesIgnorados?: Array<{
    linha: number;
    motivo?: string;
    erro?: string;
  }>;
  erro?: string;
  detalhe?: string;
};

export default function ImportarMaquinasPage() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setErro("");
    setResultado(null);

    if (!arquivo) {
      setErro("Selecione um arquivo CSV ou XLSX.");
      return;
    }

    setEnviando(true);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);

      const response = await fetch("/api/maquinas/importar", {
        method: "POST",
        body: formData,
      });

      const textoResposta = await response.text();

      let data: RespostaApiImportacao | null = null;

      try {
        data = textoResposta ? JSON.parse(textoResposta) : null;
      } catch {
        throw new Error(
          textoResposta || "A API retornou uma resposta inválida."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.erro || data?.detalhe || "Erro ao importar arquivo."
        );
      }

      setResultado({
        total: data?.totalLinhasLidas ?? 0,
        criadas: data?.criados ?? 0,
        atualizadas: data?.atualizados ?? 0,
        ignoradas: data?.ignorados ?? 0,
        erros:
          data?.detalhesIgnorados?.map((item) => ({
            linha: item.linha,
            erro: item.erro || item.motivo || "Linha ignorada.",
          })) ?? [],
      });
    } catch (error) {
      console.error("Erro ao importar:", error);

      setErro(
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao importar arquivo."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Importar Máquinas
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Envie um CSV ou XLSX para criar ou atualizar máquinas automaticamente.
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

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Modelo esperado do arquivo
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Use estas colunas no cabeçalho:
            </p>

            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
{`numero_serie,setor,usuario,login_email,login_maquina,tipo_equipamento,modelo,contrato,origem,observacoes,esset,termo_responsabilidade,numero_termo_responsabilidade`}
            </pre>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Arquivo CSV ou XLSX
              </label>

              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={enviando}
                onChange={(e) => {
                  setArquivo(e.target.files?.[0] ?? null);
                  setErro("");
                  setResultado(null);
                }}
                className="block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {arquivo && (
              <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
                Arquivo selecionado: <strong>{arquivo.name}</strong>
              </div>
            )}

            {erro && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {erro}
              </div>
            )}

            {enviando && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                Importando arquivo. Aguarde, esse processo pode demorar se o arquivo tiver muitas linhas.
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? "Importando..." : "Importar arquivo"}
            </button>
          </form>
        </section>

        {resultado && (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Resultado da importação
            </h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-100 p-4">
                <div className="text-sm text-slate-500">Total</div>
                <div className="text-2xl font-bold">{resultado.total}</div>
              </div>

              <div className="rounded-2xl bg-green-100 p-4">
                <div className="text-sm text-green-700">Criadas</div>
                <div className="text-2xl font-bold text-green-800">
                  {resultado.criadas}
                </div>
              </div>

              <div className="rounded-2xl bg-blue-100 p-4">
                <div className="text-sm text-blue-700">Atualizadas</div>
                <div className="text-2xl font-bold text-blue-800">
                  {resultado.atualizadas}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-200 p-4">
                <div className="text-sm text-slate-700">Ignoradas</div>
                <div className="text-2xl font-bold text-slate-800">
                  {resultado.ignoradas}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-base font-semibold text-slate-900">
                Linhas ignoradas
              </h3>

              {resultado.erros.length === 0 ? (
                <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
                  Nenhuma linha foi ignorada.
                </div>
              ) : (
                <div className="space-y-2">
                  {resultado.erros.map((item, index) => (
                    <div
                      key={`${item.linha}-${index}`}
                      className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                      Linha {item.linha}: {item.erro}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}