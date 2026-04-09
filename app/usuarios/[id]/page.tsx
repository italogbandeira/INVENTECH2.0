"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Usuario = {
  id: number;
  nome: string;
  login_email: string | null;
  login_maquina: string | null;
};

type MaquinaVinculada = {
  id: number;
  numero_serie: string;
  setor: string;
  tipo_equipamento: string;
  modelo: string;
  contrato: string;
  origem: string;
  esset: string;
  usuario_id?: number | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function UsuarioDetalhePage({ params }: Props) {
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [maquinas, setMaquinas] = useState<MaquinaVinculada[]>([]);
  const [maquinasDisponiveis, setMaquinasDisponiveis] = useState<
    MaquinaVinculada[]
  >([]);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvandoVinculo, setSalvandoVinculo] = useState(false);
  const [erro, setErro] = useState("");

  async function carregarDetalhe() {
    try {
      setLoading(true);
      setErro("");

      const { id } = await params;
      const idNumerico = Number(id);
      setUsuarioId(idNumerico);

      const [usuarioResponse, maquinasResponse] = await Promise.all([
        fetch(`/api/usuarios/${id}`),
        fetch(`/api/usuarios/${id}/maquinas`),
      ]);

      const usuarioData = await usuarioResponse.json();
      const maquinasData = await maquinasResponse.json();

      if (!usuarioResponse.ok) {
        throw new Error(usuarioData?.erro || "Erro ao carregar usuário.");
      }

      if (!maquinasResponse.ok) {
        throw new Error(maquinasData?.erro || "Erro ao carregar máquinas.");
      }

      setUsuario(usuarioData.usuario ?? null);
      setMaquinas(Array.isArray(maquinasData.vinculadas) ? maquinasData.vinculadas : []);
      setMaquinasDisponiveis(
        Array.isArray(maquinasData.disponiveis) ? maquinasData.disponiveis : []
      );
    } catch (error) {
      console.error(error);
      setErro("Não foi possível carregar o detalhe do usuário.");
      setUsuario(null);
      setMaquinas([]);
      setMaquinasDisponiveis([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDetalhe();
  }, [params]);

  async function handleVincularMaquina() {
    if (!usuarioId || !maquinaSelecionada) return;

    try {
      setSalvandoVinculo(true);

      const response = await fetch(`/api/usuarios/${usuarioId}/maquinas`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maquinaId: Number(maquinaSelecionada),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.erro || "Erro ao vincular máquina.");
      }

      setMaquinaSelecionada("");
      await carregarDetalhe();
    } catch (error) {
      console.error(error);
      alert("Não foi possível vincular a máquina.");
    } finally {
      setSalvandoVinculo(false);
    }
  }

  async function handleRemoverVinculo(maquinaId: number, numeroSerie: string) {
    if (!usuarioId) return;

    const confirmacao = window.confirm(
      `Deseja remover o vínculo da máquina ${numeroSerie} deste usuário?`
    );

    if (!confirmacao) return;

    try {
      setSalvandoVinculo(true);

      const response = await fetch(`/api/usuarios/${usuarioId}/maquinas`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maquinaId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.erro || "Erro ao remover vínculo.");
      }

      await carregarDetalhe();
    } catch (error) {
      console.error(error);
      alert("Não foi possível remover o vínculo da máquina.");
    } finally {
      setSalvandoVinculo(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Detalhe do usuário
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Visualize as informações do usuário e as máquinas vinculadas.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {usuarioId && (
                <Link
                  href={`/usuarios/${usuarioId}/editar`}
                  className="inline-flex items-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-amber-600"
                >
                  Editar
                </Link>
              )}

              <Link
                href="/usuarios"
                className="inline-flex items-center rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Voltar
              </Link>
            </div>
          </div>
        </section>

        {erro && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
            {erro}
          </section>
        )}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Informações do usuário
              </h2>

              {loading ? (
                <p className="mt-4 text-sm text-slate-500">Carregando...</p>
              ) : !usuario ? (
                <p className="mt-4 text-sm text-slate-500">
                  Usuário não encontrado.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      ID
                    </p>
                    <p className="mt-1 text-sm text-slate-900">{usuario.id}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Nome
                    </p>
                    <p className="mt-1 text-sm text-slate-900">{usuario.nome}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Login e-mail
                    </p>
                    <p className="mt-1 text-sm text-slate-900">
                      {usuario.login_email || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Login máquina
                    </p>
                    <p className="mt-1 text-sm text-slate-900">
                      {usuario.login_maquina || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Máquinas vinculadas
                    </p>
                    <p className="mt-1 text-sm text-slate-900">
                      {maquinas.length}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Vincular máquina
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Selecione uma máquina disponível para atribuí-la a este usuário.
              </p>

              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <select
                  value={maquinaSelecionada}
                  onChange={(e) => setMaquinaSelecionada(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3"
                >
                  <option value="">Selecione uma máquina</option>
                  {maquinasDisponiveis.map((maquina) => (
                    <option key={maquina.id} value={maquina.id}>
  {maquina.numero_serie} — {maquina.setor} — {maquina.tipo_equipamento} — {maquina.modelo}
</option>
                  ))}
                </select>

                <button
                  onClick={handleVincularMaquina}
                  disabled={!maquinaSelecionada || salvandoVinculo}
                  className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvandoVinculo ? "Salvando..." : "Vincular"}
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Máquinas vinculadas
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Relação das máquinas atualmente atribuídas a este usuário.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-slate-900 text-left text-white">
                    <tr>
                      <th className="p-4 text-sm font-semibold">ID</th>
                      <th className="p-4 text-sm font-semibold">Número de série</th>
                      <th className="p-4 text-sm font-semibold">Setor</th>
                      <th className="p-4 text-sm font-semibold">Tipo</th>
                      <th className="p-4 text-sm font-semibold">Modelo</th>
                      <th className="p-4 text-sm font-semibold">Contrato</th>
                      <th className="p-4 text-sm font-semibold">Origem</th>
                      <th className="p-4 text-sm font-semibold">ESSET</th>
                      <th className="p-4 text-sm font-semibold">Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {maquinas.map((maquina) => (
                      <tr
                        key={maquina.id}
                        className="border-t border-slate-200 odd:bg-white even:bg-slate-50"
                      >
                        <td className="p-4 text-sm text-slate-700">{maquina.id}</td>
                        <td className="p-4 text-sm font-medium text-slate-900">
                          {maquina.numero_serie}
                        </td>
                        <td className="p-4 text-sm text-slate-700">{maquina.setor}</td>
                        <td className="p-4 text-sm text-slate-700">
                          {maquina.tipo_equipamento}
                        </td>
                        <td className="p-4 text-sm text-slate-700">{maquina.modelo}</td>
                        <td className="p-4 text-sm text-slate-700">{maquina.contrato}</td>
                        <td className="p-4 text-sm text-slate-700">{maquina.origem}</td>
                        <td className="p-4 text-sm text-slate-700">{maquina.esset}</td>
                        <td className="p-4">
                          <button
                            onClick={() =>
                              handleRemoverVinculo(maquina.id, maquina.numero_serie)
                            }
                            disabled={salvandoVinculo}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!loading && maquinas.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-10 text-center">
                          <div className="text-sm font-medium text-slate-700">
                            Nenhuma máquina vinculada a este usuário.
                          </div>
                        </td>
                      </tr>
                    )}

                    {loading && (
                      <tr>
                        <td
                          colSpan={9}
                          className="p-10 text-center text-sm text-slate-500"
                        >
                          Carregando máquinas...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Documentos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Área preparada para os anexos do usuário.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-dashed border-slate-300 p-4">
              <p className="text-sm font-medium text-slate-800">
                Termo de Cessão de Equip - Tempo Indeterminado
              </p>
              <p className="mt-2 text-sm text-slate-500">Em construção.</p>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 p-4">
              <p className="text-sm font-medium text-slate-800">
                Termo de Devolução de Equipamento
              </p>
              <p className="mt-2 text-sm text-slate-500">Em construção.</p>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 p-4">
              <p className="text-sm font-medium text-slate-800">
                Termo de Cessão Temporária de Equipamento
              </p>
              <p className="mt-2 text-sm text-slate-500">Em construção.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}