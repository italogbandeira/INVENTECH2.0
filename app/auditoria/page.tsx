"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuditoriaLog = {
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

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const response = await fetch("/api/auditoria");
        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao carregar auditoria:", error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

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
              className="inline-flex items-center rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
            >
              Voltar
            </Link>
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
                  <th className="p-4 text-sm font-semibold">Antes</th>
                  <th className="p-4 text-sm font-semibold">Depois</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-slate-500">
                      Carregando histórico...
                    </td>
                  </tr>
                )}

                {!loading &&
                  logs.map((log) => (
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
                        {log.acao}
                      </td>

                      <td className="p-4 text-sm text-slate-700">
                        {log.entidade}
                      </td>

                      <td className="p-4 text-sm text-slate-700">
                        {log.entidadeId ?? "-"}
                      </td>

                      <td className="p-4 text-sm text-slate-700">
                        {log.descricao ?? "-"}
                      </td>

                      <td className="max-w-md p-4 text-xs text-slate-700">
                        <pre className="whitespace-pre-wrap break-words">
                          {log.antes ?? "-"}
                        </pre>
                      </td>

                      <td className="max-w-md p-4 text-xs text-slate-700">
                        <pre className="whitespace-pre-wrap break-words">
                          {log.depois ?? "-"}
                        </pre>
                      </td>
                    </tr>
                  ))}

                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-slate-500">
                      Nenhum histórico encontrado.
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