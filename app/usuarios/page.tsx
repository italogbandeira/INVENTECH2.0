"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Usuario = {
  id: number;
  nome: string;
  login_email: string | null;
  login_maquina: string | null;
  totalMaquinas: number;
};

function exibirValor(valor: string | null) {
  const texto = String(valor ?? "")
    .replace(/\u00A0/g, " ")
    .trim();

  if (
    !texto ||
    texto === "-" ||
    texto.toLowerCase() === "null" ||
    texto.toLowerCase() === "n/a" ||
    texto.toLowerCase() === "na" ||
    texto.toLowerCase() === "undefined"
  ) {
    return "-";
  }

  return texto;
}

function normalizarPessoa(valor: string | null) {
  return String(valor ?? "")
    .replace(/\u00A0/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/[^\w\s.@-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarBusca(valor: string | null) {
  return normalizarPessoa(valor);
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  async function carregarUsuarios() {
    try {
      setLoading(true);
      setErro("");

      const response = await fetch("/api/usuarios");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.erro || "Erro ao carregar usuários.");
      }

      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data?.usuarios)
          ? data.usuarios
          : [];

      setUsuarios(lista);
    } catch (error) {
      console.error(error);
      setUsuarios([]);

      setErro(
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao carregar usuários."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarUsuarios();
  }, []);

  const duplicadosPorNome = useMemo(() => {
    return usuarios.reduce<Record<string, number>>((acc, usuario) => {
      const chave = normalizarPessoa(usuario.nome);

      if (!chave || chave === "livre") {
        return acc;
      }

      acc[chave] = (acc[chave] ?? 0) + 1;
      return acc;
    }, {});
  }, [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);

    if (!termo) {
      return usuarios;
    }

    return usuarios.filter((usuario) => {
      const campos = [
        String(usuario.id),
        usuario.nome,
        usuario.login_email,
        usuario.login_maquina,
        String(usuario.totalMaquinas),
      ];

      return campos.some((campo) => normalizarBusca(campo).includes(termo));
    });
  }, [usuarios, busca]);

  const totalPossiveisDuplicados = useMemo(() => {
    return Object.values(duplicadosPorNome).filter((total) => total > 1).length;
  }, [duplicadosPorNome]);

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

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                  Total: {usuarios.length}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                  Exibindo: {usuariosFiltrados.length}
                </span>

                {totalPossiveisDuplicados > 0 && (
                  <span className="rounded-full bg-yellow-100 px-3 py-1 font-semibold text-yellow-800">
                    {totalPossiveisDuplicados} possível(is) grupo(s) duplicado(s)
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/usuarios/novo"
                className="inline-flex items-center rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700"
              >
                Novo usuário
              </Link>

              <button
                type="button"
                onClick={() => void carregarUsuarios()}
                disabled={loading}
                className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Atualizar
              </button>

              <Link
                href="/"
                className="inline-flex items-center rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Voltar
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Buscar usuário
          </label>

          <input
            type="text"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Busque por nome, login, ID ou quantidade de máquinas..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-500"
          />

          <p className="mt-2 text-xs text-slate-500">
            A busca ignora diferença de acentos, espaços extras e maiúsculas.
          </p>
        </section>

        {erro && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {erro}
          </section>
        )}

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

                {!loading &&
                  usuariosFiltrados.map((usuario) => {
                    const chaveDuplicado = normalizarPessoa(usuario.nome);
                    const possivelDuplicado =
                      chaveDuplicado &&
                      duplicadosPorNome[chaveDuplicado] > 1 &&
                      chaveDuplicado !== "livre";

                    return (
                      <tr
                        key={usuario.id}
                        className="border-t border-slate-200 odd:bg-white even:bg-slate-50"
                      >
                        <td className="p-4 text-sm text-slate-700">
                          {usuario.id}
                        </td>

                        <td className="p-4 text-sm font-medium text-slate-900">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{exibirValor(usuario.nome)}</span>

                              {possivelDuplicado && (
                                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                                  Possível duplicado
                                </span>
                              )}
                            </div>

                            {possivelDuplicado && (
                              <span className="text-xs font-normal text-slate-500">
                                Nome normalizado: {chaveDuplicado}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-sm text-slate-700">
                          {exibirValor(usuario.login_email)}
                        </td>

                        <td className="p-4 text-sm text-slate-700">
                          {exibirValor(usuario.login_maquina)}
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
                    );
                  })}

                {!loading && usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center">
                      <div className="text-sm font-medium text-slate-700">
                        Nenhum usuário encontrado.
                      </div>

                      {busca && (
                        <button
                          type="button"
                          onClick={() => setBusca("")}
                          className="mt-3 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                        >
                          Limpar busca
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {totalPossiveisDuplicados > 0 && (
          <section className="rounded-3xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-900 shadow-sm">
            <h2 className="font-semibold">Atenção</h2>

            <p className="mt-1">
              Usuários marcados como possível duplicado têm nomes que ficam
              iguais após remover acentos, espaços extras e diferenças de
              maiúsculas. Essa tela apenas identifica o problema; para juntar as
              máquinas em um único cadastro, ainda é necessário mesclar os
              registros no banco ou criar uma rotina de mesclagem.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}