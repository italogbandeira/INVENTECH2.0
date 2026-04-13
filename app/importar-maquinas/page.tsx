"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Estrutura do resultado retornado pela importação.
 *
 * total: linhas processadas
 * criadas: novas máquinas inseridas
 * atualizadas: máquinas existentes alteradas
 * ignoradas: linhas descartadas pelo processo
 * erros: problemas encontrados por linha
 */
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

/**
 * Página de importação de máquinas por CSV.
 *
 * Responsabilidades:
 * - receber arquivo CSV
 * - enviar para a API
 * - exibir resultado da importação
 * - mostrar eventuais erros por linha
 */
export default function ImportarMaquinasPage() {
  /**
   * Arquivo selecionado no input.
   */
  const [arquivo, setArquivo] = useState<File | null>(null);

  /**
   * Estados de controle e feedback.
   */
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

  /**
   * Envia o CSV para a API de importação.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setResultado(null);

    if (!arquivo) {
      setErro("Selecione um arquivo CSV.");
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

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao importar CSV.");
        return;
      }

      setResultado(data.resultado);
    } catch (error) {
      console.error(error);
      setErro("Erro ao enviar arquivo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Cabeçalho da tela */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Importar Máquinas
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Envie um CSV para criar ou atualizar máquinas automaticamente.
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

        {/* Formulário de importação */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Modelo esperado do CSV
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Use estas colunas no cabeçalho:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
numero_serie,setor,usuario,tipo_equipamento,modelo,contrato,origem,observacoes,esset,termo_responsabilidade,numero_termo_responsabilidade
            </pre>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Arquivo CSV
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                className="block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
              />
            </div>

            {erro && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? "Importando..." : "Importar CSV"}
            </button>
          </form>
        </section>

        {/* Resultado da importação */}
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
                Erros
              </h3>

              {resultado.erros.length === 0 ? (
                <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
                  Nenhum erro encontrado.
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