"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Página de primeiro acesso do sistema.
 *
 * Objetivo:
 * permitir a criação inicial da conta master.
 *
 * Fluxo:
 * - usuário informa nome, e-mail e senha
 * - frontend envia para /api/primeiro-acesso
 * - em caso de sucesso, redireciona para login
 */
export default function PrimeiroAcessoPage() {
  const router = useRouter();

  /**
   * Estados do formulário.
   */
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  /**
   * Estados de feedback da tela.
   */
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

  /**
   * Envia os dados para criação da conta master inicial.
   *
   * Regras:
   * - limpa mensagens anteriores
   * - mostra feedback visual de carregamento
   * - em sucesso, redireciona para login após pequeno intervalo
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCarregando(true);

    try {
      const response = await fetch("/api/primeiro-acesso", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome, email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao criar conta master.");
        return;
      }

      setSucesso("Conta master criada com sucesso.");

      /**
       * Pequeno atraso para o usuário conseguir ler a mensagem
       * antes do redirecionamento.
       */
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-center text-2xl font-bold">
          Primeiro acesso
        </h1>

        <p className="mb-6 text-center text-sm text-gray-600">
          Crie o usuário master do sistema.
        </p>

        {erro && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="mb-4 rounded-lg bg-green-100 p-3 text-green-700">
            {sucesso}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Nome
            </label>
            <input
              type="text"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Senha
            </label>
            <input
              type="password"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {carregando ? "Criando..." : "Criar conta master"}
          </button>
        </form>
      </div>
    </main>
  );
}