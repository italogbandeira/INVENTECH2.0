"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ItemFiltro = {
  id: number;
  nome: string;
};

export default function NovaMaquinaPage() {
  const router = useRouter();

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
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarFiltros() {
      const [
        setoresRes,
        usuariosRes,
        tiposRes,
        modelosRes,
        contratosRes,
        origensRes,
      ] = await Promise.all([
        fetch("/api/setores"),
        fetch("/api/usuarios"),
        fetch("/api/tipos-equipamento"),
        fetch("/api/modelos"),
        fetch("/api/contratos"),
        fetch("/api/origens"),
      ]);

      const [
        setoresData,
        usuariosData,
        tiposData,
        modelosData,
        contratosData,
        origensData,
      ] = await Promise.all([
        setoresRes.json(),
        usuariosRes.json(),
        tiposRes.json(),
        modelosRes.json(),
        contratosRes.json(),
        origensRes.json(),
      ]);

      setSetores(setoresData);
      setUsuarios(usuariosData);
      setTiposEquipamento(tiposData);
      setModelos(modelosData);
      setContratos(contratosData);
      setOrigens(origensData);
    }

    carregarFiltros();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
if (!numeroSerie.trim()) {
  setErro("Informe o número de série.");
  return;
}

if (!setorId) {
  setErro("Selecione um setor.");
  return;
}

    const response = await fetch("/api/maquinas", {
      method: "POST",
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
      setErro(data.error || "Erro ao cadastrar máquina.");
      setSalvando(false);
      return;
    }

    router.push("/?sucesso=maquina-criada");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">Nova Máquina</h1>

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
              {salvando ? "Salvando..." : "Salvar"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}