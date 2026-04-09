"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Usuario = {
  id: number;
  nome: string;
  login_email: string | null;
  login_maquina: string | null;
  totalMaquinas: number;
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregarUsuarios() {
    try {
      setLoading(true);

      const response = await fetch("/api/usuarios");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.erro || "Erro ao carregar usuários.");
      }

      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Usuários
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Cadastro e consulta dos usuários vinculados às máquinas.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/usuarios/novo"
                className="inline-flex items-center rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700"
              >
                Novo usuário
              </Link>

              <Link
                href="/"
                className="inline-flex items-center rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Voltar
              </Link>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-900 text-left text-white">
                <tr>
                  <th className="p-4 text-sm font-semibold">ID</th>
                  <th className="p-4 text-sm font-semibold">Nome</th>
                  <th className="p-4 text-sm font-semibold">Login e-mail</th>
                  <th className="p-4 text-sm font-semibold">Login máquina</th>
                  <th className="p-4 text-sm font-semibold">Máquinas vinculadas</th>
                  <th className="p-4 text-sm font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody>
                {usuarios.map((usuario) => (
                  <tr
  key={usuario.id}
  className="border-t border-slate-200 odd:bg-white even:bg-slate-50"
>
  <td className="p-4 text-sm text-slate-700">{usuario.id}</td>
  <td className="p-4 text-sm font-medium text-slate-900">
    {usuario.nome}
  </td>
  <td className="p-4 text-sm text-slate-700">
    {usuario.login_email || "-"}
  </td>
  <td className="p-4 text-sm text-slate-700">
    {usuario.login_maquina || "-"}
  </td>
  <td className="p-4 text-sm text-slate-700">
    {usuario.totalMaquinas}
  </td>
  <td className="p-4">
    <Link
      href={`/usuarios/${usuario.id}`}
      className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
    >
      Ver
    </Link>
  </td>
</tr>
                ))}

                {!loading && usuarios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center">
                      <div className="text-sm font-medium text-slate-700">
                        Nenhum usuário encontrado.
                      </div>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-10 text-center text-sm text-slate-500"
                    >
                      Carregando usuários...
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