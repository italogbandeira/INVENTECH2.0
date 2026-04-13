"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Estrutura do funcionário exibido na tela.
 */
type Funcionario = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
};

type Props = {
  funcionarios: Funcionario[];
};

/**
 * Componente client responsável pela gestão interativa dos funcionários.
 *
 * Funcionalidades:
 * - criar novo funcionário
 * - editar funcionário existente
 * - redefinir senha
 * - inativar
 * - excluir
 *
 * Observação:
 * a lista inicial vem do componente server-side da página.
 */
export default function FuncionariosClient({ funcionarios }: Props) {
  const router = useRouter();

  /**
   * Estados do formulário de criação.
   */
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState("operador");

  /**
   * Estados do modo de edição.
   */
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPerfil, setEditPerfil] = useState("operador");

  /**
   * Estados de feedback e submissão.
   */
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

  /**
   * Cria um novo funcionário.
   */
  async function criarFuncionario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCarregando(true);

    try {
      const response = await fetch("/api/funcionarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome, email, senha, perfil }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao criar funcionário.");
        return;
      }

      setSucesso("Funcionário criado com sucesso.");
      setNome("");
      setEmail("");
      setSenha("");
      setPerfil("operador");
      router.refresh();
    } catch {
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setCarregando(false);
    }
  }

  /**
   * Entra em modo de edição para um funcionário específico.
   */
  function iniciarEdicao(funcionario: Funcionario) {
    setEditandoId(funcionario.id);
    setEditNome(funcionario.nome);
    setEditEmail(funcionario.email);
    setEditPerfil(funcionario.perfil);
    setErro("");
    setSucesso("");
  }

  /**
   * Cancela a edição em andamento.
   */
  function cancelarEdicao() {
    setEditandoId(null);
    setEditNome("");
    setEditEmail("");
    setEditPerfil("operador");
  }

  /**
   * Salva edição de nome, email e perfil.
   */
  async function salvarEdicao(id: number) {
    setErro("");
    setSucesso("");

    try {
      const response = await fetch(`/api/funcionarios/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "editar",
          nome: editNome,
          email: editEmail,
          perfil: editPerfil,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao editar funcionário.");
        return;
      }

      setSucesso("Funcionário editado com sucesso.");
      cancelarEdicao();
      router.refresh();
    } catch {
      setErro("Erro ao conectar com o servidor.");
    }
  }

  /**
   * Redefine a senha do funcionário.
   *
   * Observação:
   * a nova senha é coletada via prompt simples.
   * No futuro isso pode ser substituído por modal mais seguro.
   */
  async function redefinirSenha(id: number) {
    const novaSenha = window.prompt("Digite a nova senha:");

    if (!novaSenha) return;

    setErro("");
    setSucesso("");

    try {
      const response = await fetch(`/api/funcionarios/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "redefinirSenha",
          novaSenha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao redefinir senha.");
        return;
      }

      setSucesso("Senha redefinida com sucesso.");
      router.refresh();
    } catch {
      setErro("Erro ao conectar com o servidor.");
    }
  }

  /**
   * Inativa um funcionário, sem excluí-lo do banco.
   */
  async function inativarFuncionario(id: number) {
    const confirmar = window.confirm(
      "Tem certeza que deseja inativar este funcionário?"
    );

    if (!confirmar) return;

    setErro("");
    setSucesso("");

    try {
      const response = await fetch(`/api/funcionarios/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "inativar",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao inativar funcionário.");
        return;
      }

      setSucesso("Funcionário inativado com sucesso.");
      router.refresh();
    } catch {
      setErro("Erro ao conectar com o servidor.");
    }
  }

  /**
   * Exclui permanentemente um funcionário.
   *
   * Regra de segurança:
   * exige confirmação textual com "DELETAR".
   */
  async function excluirFuncionario(id: number) {
    const confirmacao = window.prompt(
      'Essa ação não tem volta. Digite "DELETAR" para confirmar.'
    );

    if (!confirmacao) return;

    setErro("");
    setSucesso("");

    try {
      const response = await fetch(`/api/funcionarios/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmacao,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao excluir funcionário.");
        return;
      }

      setSucesso("Funcionário excluído com sucesso.");
      router.refresh();
    } catch {
      setErro("Erro ao conectar com o servidor.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Bloco de criação */}
        <div className="rounded-xl bg-white p-6 shadow">
          <h1 className="mb-6 text-2xl font-bold text-black">Funcionários</h1>

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

          <form onSubmit={criarFuncionario} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Nome
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Perfil
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black"
                value={perfil}
                onChange={(e) => setPerfil(e.target.value)}
              >
                <option value="operador">Operador</option>
                <option value="master">Master</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={carregando}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {carregando ? "Salvando..." : "Adicionar funcionário"}
              </button>
            </div>
          </form>
        </div>

        {/* Lista e ações por funcionário */}
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-black">
            Lista de funcionários
          </h2>

          <div className="space-y-3">
            {funcionarios.map((funcionario) => (
              <div
                key={funcionario.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                {editandoId === funcionario.id ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black">
                        Nome
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-black">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-black">
                        Perfil
                      </label>
                      <select
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black"
                        value={editPerfil}
                        onChange={(e) => setEditPerfil(e.target.value)}
                      >
                        <option value="operador">Operador</option>
                        <option value="master">Master</option>
                      </select>
                    </div>

                    <div className="flex items-end gap-2">
                      <button
                        onClick={() => salvarEdicao(funcionario.id)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                      >
                        Salvar
                      </button>

                      <button
                        onClick={cancelarEdicao}
                        className="rounded-lg bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-black">
                      <strong>Nome:</strong> {funcionario.nome}
                    </div>
                    <div className="text-black">
                      <strong>Email:</strong> {funcionario.email}
                    </div>
                    <div className="text-black">
                      <strong>Perfil:</strong> {funcionario.perfil}
                    </div>
                    <div className="mb-3 text-black">
                      <strong>Ativo:</strong> {funcionario.ativo ? "Sim" : "Não"}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => iniciarEdicao(funcionario)}
                        className="rounded-lg bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => redefinirSenha(funcionario.id)}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                      >
                        Redefinir senha
                      </button>

                      {funcionario.ativo && funcionario.perfil !== "master" && (
                        <button
                          onClick={() => inativarFuncionario(funcionario.id)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                        >
                          Inativar
                        </button>
                      )}

                      {funcionario.perfil !== "master" && (
                        <button
                          onClick={() => excluirFuncionario(funcionario.id)}
                          className="rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}