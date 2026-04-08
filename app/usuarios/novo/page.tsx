"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function NovoUsuarioPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginMaquina, setLoginMaquina] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");

    if (!nome.trim()) {
      setErro("O nome é obrigatório.");
      return;
    }

    try {
      setSalvando(true);

      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: nome.trim(),
          login_email: loginEmail.trim() || null,
          login_maquina: loginMaquina.trim() || null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.erro || "Erro ao criar usuário.");
      }

      router.push("/usuarios");
      router.refresh();
    } catch (error) {
      console.error(error);
      setErro("Não foi possível cadastrar o usuário.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Novo usuário
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Cadastre um novo usuário para vínculo com máquinas e documentos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/usuarios"
                className="inline-flex items-center rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Voltar
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            {erro && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {erro}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nome *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-cyan-600"
                  placeholder="Digite o nome do usuário"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Login e-mail
                </label>
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-cyan-600"
                  placeholder="Digite o e-mail de login"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Login máquina
                </label>
                <input
                  type="text"
                  value={loginMaquina}
                  onChange={(e) => setLoginMaquina(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none transition focus:border-cyan-600"
                  placeholder="Digite o login da máquina"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar usuário"}
              </button>

              <Link
                href="/usuarios"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}