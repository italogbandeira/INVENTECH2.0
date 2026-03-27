"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ItemFiltro = {
  id: number;
  nome: string;
};

type Maquina = {
  id: number;
  numero_serie: string;
  setor_id: number | null;
  usuario_id: number | null;
  tipo_equipamento_id: number | null;
  modelo_id: number | null;
  contrato_id: number | null;
  origem_id: number | null;
  observacoes: string | null;
  esset: string | null;
  termo_responsabilidade: string | null;
  numero_termo_responsabilidade: string | null;
};

export default function EditarMaquinaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [mostrarConfirmacaoExcluir, setMostrarConfirmacaoExcluir] =
    useState(false);
  const [textoConfirmacaoExcluir, setTextoConfirmacaoExcluir] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  const [numeroSerie, setNumeroSerie] = useState("");
  const [setorId, setSetorId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [tipoEquipamentoId, setTipoEquipamentoId] = useState("");
  const [modeloId, setModeloId] = useState("");
  const [contratoId, setContratoId] = useState("");
  const [origemId, setOrigemId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [esset, setEsset] = useState("");
  const [termoResponsabilidade, setTermoResponsabilidade] = useState("");
  const [numeroTermoResponsabilidade, setNumeroTermoResponsabilidade] =
    useState("");

  const [setores, setSetores] = useState<ItemFiltro[]>([]);
  const [usuarios, setUsuarios] = useState<ItemFiltro[]>([]);
  const [tiposEquipamento, setTiposEquipamento] = useState<ItemFiltro[]>([]);
  const [modelos, setModelos] = useState<ItemFiltro[]>([]);
  const [contratos, setContratos] = useState<ItemFiltro[]>([]);
  const [origens, setOrigens] = useState<ItemFiltro[]>([]);

  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarTudo() {
      try {
        const [
          maquinaRes,
          setoresRes,
          usuariosRes,
          tiposRes,
          modelosRes,
          contratosRes,
          origensRes,
        ] = await Promise.all([
          fetch(`/api/maquinas/${id}`),
          fetch("/api/setores"),
          fetch("/api/usuarios"),
          fetch("/api/tipos-equipamento"),
          fetch("/api/modelos"),
          fetch("/api/contratos"),
          fetch("/api/origens"),
        ]);

        const [
          maquina,
          setoresData,
          usuariosData,
          tiposData,
          modelosData,
          contratosData,
          origensData,
        ] = await Promise.all([
          maquinaRes.json() as Promise<Maquina | { error: string }>,
          setoresRes.json() as Promise<ItemFiltro[]>,
          usuariosRes.json() as Promise<ItemFiltro[]>,
          tiposRes.json() as Promise<ItemFiltro[]>,
          modelosRes.json() as Promise<ItemFiltro[]>,
          contratosRes.json() as Promise<ItemFiltro[]>,
          origensRes.json() as Promise<ItemFiltro[]>,
        ]);

        if (!maquinaRes.ok || "error" in maquina) {
          setErro(
            "error" in maquina ? maquina.error : "Erro ao carregar máquina."
          );
          setCarregando(false);
          return;
        }

        setSetores(setoresData);
        setUsuarios(usuariosData);
        setTiposEquipamento(tiposData);
        setModelos(modelosData);
        setContratos(contratosData);
        setOrigens(origensData);

        setNumeroSerie(maquina.numero_serie ?? "");
        setSetorId(maquina.setor_id ? String(maquina.setor_id) : "");
        setUsuarioId(maquina.usuario_id ? String(maquina.usuario_id) : "");
        setTipoEquipamentoId(
          maquina.tipo_equipamento_id
            ? String(maquina.tipo_equipamento_id)
            : ""
        );
        setModeloId(maquina.modelo_id ? String(maquina.modelo_id) : "");
        setContratoId(maquina.contrato_id ? String(maquina.contrato_id) : "");
        setOrigemId(maquina.origem_id ? String(maquina.origem_id) : "");
        setObservacoes(maquina.observacoes ?? "");
        setEsset(maquina.esset ?? "");
        setTermoResponsabilidade(maquina.termo_responsabilidade ?? "");
        setNumeroTermoResponsabilidade(
          maquina.numero_termo_responsabilidade ?? ""
        );
      } catch (error) {
        console.error("Erro ao carregar dados da máquina:", error);
        setErro("Erro ao carregar dados.");
      } finally {
        setCarregando(false);
      }
    }

    if (id) {
      carregarTudo();
    }
  }, [id]);

  async function handleExcluir() {
    if (textoConfirmacaoExcluir !== "DELETAR") {
      setErro("Digite DELETAR em maiúsculo para confirmar a exclusão.");
      return;
    }

    setErro("");
    setExcluindo(true);

    try {
      const response = await fetch(`/api/maquinas/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || "Erro ao excluir máquina.");
        return;
      }

      router.push("/?sucesso=maquina-excluida");
    } catch (error) {
      console.error("Erro ao excluir máquina:", error);
      setErro("Erro ao excluir máquina.");
    } finally {
      setExcluindo(false);
      setMostrarConfirmacaoExcluir(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    if (!numeroSerie.trim()) {
      setErro("Informe o número de série.");
      setSalvando(false);
      return;
    }

    if (!setorId) {
      setErro("Selecione um setor.");
      setSalvando(false);
      return;
    }

    try {
      const response = await fetch(`/api/maquinas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numero_serie: numeroSerie.trim(),
          setor_id: Number(setorId),
          usuario_id: usuarioId ? Number(usuarioId) : null,
          tipo_equipamento_id: tipoEquipamentoId
            ? Number(tipoEquipamentoId)
            : null,
          modelo_id: modeloId ? Number(modeloId) : null,
          contrato_id: contratoId ? Number(contratoId) : null,
          origem_id: origemId ? Number(origemId) : null,
          observacoes: observacoes || null,
          esset: esset || null,
          termo_responsabilidade: termoResponsabilidade || null,
          numero_termo_responsabilidade: numeroTermoResponsabilidade || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || "Erro ao atualizar máquina.");
        setSalvando(false);
        return;
      }

      router.push("/?sucesso=maquina-editada");
    } catch (error) {
      console.error("Erro ao enviar atualização:", error);
      setErro("Erro ao atualizar máquina.");
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
        <div className="mx-auto max-w-4xl">Carregando...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">Editar Máquina</h1>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white p-6 shadow-md"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Número de Série *
              </label>
              <input
                type="text"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Setor *</label>
              <select
                value={setorId}
                onChange={(e) => setSetorId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
                required
              >
                <option value="">Selecione</option>
                {setores.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Usuário</label>
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              >
                <option value="">Selecione</option>
                {usuarios.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Tipo de Equipamento
              </label>
              <select
                value={tipoEquipamentoId}
                onChange={(e) => setTipoEquipamentoId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              >
                <option value="">Selecione</option>
                {tiposEquipamento.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Modelo</label>
              <select
                value={modeloId}
                onChange={(e) => setModeloId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              >
                <option value="">Selecione</option>
                {modelos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Contrato</label>
              <select
                value={contratoId}
                onChange={(e) => setContratoId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              >
                <option value="">Selecione</option>
                {contratos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Origem</label>
              <select
                value={origemId}
                onChange={(e) => setOrigemId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              >
                <option value="">Selecione</option>
                {origens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">ESSET</label>
              <input
                type="text"
                value={esset}
                onChange={(e) => setEsset(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Termo de Responsabilidade
              </label>
              <input
                type="text"
                value={termoResponsabilidade}
                onChange={(e) => setTermoResponsabilidade(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Número do Termo
              </label>
              <input
                type="text"
                value={numeroTermoResponsabilidade}
                onChange={(e) => setNumeroTermoResponsabilidade(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Observações
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
                rows={4}
              />
            </div>
          </div>

          {erro && (
            <div className="mt-4 rounded-lg bg-red-100 p-3 text-red-700">
              {erro}
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar Alterações"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Cancelar
            </button>

            <button
  type="button"
  onClick={() => {
    setErro("");
    setTextoConfirmacaoExcluir("");
    setMostrarConfirmacaoExcluir(true);
  }}
  className="rounded-lg bg-red-700 px-4 py-2 text-black shadow-sm hover:bg-red-800"
>
  Excluir
</button>
          </div>
        </form>

        {mostrarConfirmacaoExcluir && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h2 className="mb-3 text-xl font-bold text-red-700">
                Confirmar exclusão
              </h2>

              <p className="mb-3 text-sm text-gray-700">
                Esta ação não tem volta. Para confirmar, digite{" "}
                <span className="font-bold">DELETAR</span> em maiúsculo.
              </p>

              <input
                type="text"
                value={textoConfirmacaoExcluir}
                onChange={(e) => setTextoConfirmacaoExcluir(e.target.value)}
                className="mb-4 w-full rounded-lg border border-gray-300 p-2"
                placeholder="Digite DELETAR"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExcluir}
                  disabled={excluindo}
                  className="rounded-lg bg-red-600 px-4 py-2 text-BLACK hover:bg-red-700 disabled:opacity-60"
                >
                  {excluindo ? "Excluindo..." : "Confirmar exclusão"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMostrarConfirmacaoExcluir(false);
                    setTextoConfirmacaoExcluir("");
                    setErro("");
                  }}
                  className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}