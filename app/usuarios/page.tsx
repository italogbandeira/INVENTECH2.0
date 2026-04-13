"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Estrutura de usuário exibida na listagem.
 *
 * totalMaquinas:
 * quantidade de máquinas atualmente vinculadas a esse usuário.
 */
type Usuario = {
  id: number;
  nome: string;
  login_email: string | null;
  login_maquina: string | null;
  totalMaquinas: number;
};

/**
 * Página de listagem de usuários.
 *
 * Responsabilidades:
 * - buscar todos os usuários via API
 * - exibir a tabela com dados básicos
 * - mostrar total de máquinas vinculadas
 * - permitir navegação para criação e detalhe
 */
export default function UsuariosPage() {
  /**
   * Lista carregada da API.
   */
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  /**
   * Estado de carregamento inicial da tela.
   */
  const [loading, setLoading] = useState(true);

  /**
   * Busca os usuários cadastrados no sistema.
   *
   * Fluxo:
   * 1. ativa loading
   * 2. chama a rota /api/usuarios
   * 3. valida retorno
   * 4. popula a tabela
   *
   * Em caso de erro, a listagem é esvaziada para evitar
   * mostrar dados antigos na tela.
   */
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

  /**
   * Carregamento inicial da página.
   */
  useEffect(() => {
    carregarUsuarios();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Cabeçalho da tela */}
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

            {/* Ações rápidas da tela */}
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

        {/* Tabela principal */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-900 text-left text-white">
                <tr>
                  <th className="p-4 text-sm font-semibold">ID</th>
                  <th className="p-4 text-sm font-semibold">Nome</th>
                  <th className="p-4 text-sm font-semibold">Login e-mail</th>
                  <th className="p-4 text-sm font-semibold">Login máquina</th>
                  <th className="p-4 text-sm font-semibold">
                    Máquinas vinculadas
                  </th>
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

                {/* Estado vazio */}
                {!loading && usuarios.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center">
                      <div className="text-sm font-medium text-slate-700">
                        Nenhum usuário encontrado.
                      </div>
                    </td>
                  </tr>
                )}

                {/* Estado de carregamento */}
                {loading && (
                  <tr>
                    <td
                      colSpan={6}
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