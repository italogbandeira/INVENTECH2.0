"use client";

import { useRouter } from "next/navigation";

/**
 * Botão simples de logout.
 *
 * Responsabilidades:
 * - chamar a rota de logout no backend
 * - redirecionar o usuário para a tela de login
 * - forçar refresh da navegação após sair
 *
 * Observação:
 * este componente é propositalmente enxuto e reutilizável.
 */
export default function BotaoLogout() {
  const router = useRouter();

  /**
   * Encerra a sessão atual do usuário.
   *
   * Fluxo:
   * 1. chama a rota /api/logout
   * 2. redireciona para /login
   * 3. força refresh para limpar estado de navegação
   *
   * Observação:
   * hoje não há tratamento explícito de erro.
   * Em uma evolução futura, isso pode virar toast ou feedback visual.
   */
  async function sair() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={sair}
      className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
    >
      Sair
    </button>
  );
}