"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MultiSelectFilter from "@/components/MultiSelectFilter";

type MaquinaDetalhada = {
  id: number;
  numero_serie: string;
  setor: string | null;
  usuario: string | null;
  tipo_equipamento: string | null;
  modelo: string | null;
  contrato: string | null;
  origem: string | null;
  observacoes: string | null;
  esset: string | null;
  termo_responsabilidade: string | null;
  numero_termo_responsabilidade: string | null;
};

type ItemFiltro = {
  id: number;
  nome: string;
};

type FuncionarioLogado = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
};

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [maquinas, setMaquinas] = useState<MaquinaDetalhada[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [funcionarioLogado, setFuncionarioLogado] =
    useState<FuncionarioLogado | null>(null);

  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [exportando, setExportando] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const sucesso = searchParams.get("sucesso");

  const [numeroSerie, setNumeroSerie] = useState("");
  const [setoresSelecionados, setSetoresSelecionados] = useState<string[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>(
    []
  );
  const [tiposSelecionados, setTiposSelecionados] = useState<string[]>([]);
  const [modelosSelecionados, setModelosSelecionados] = useState<string[]>([]);
  const [contratosSelecionados, setContratosSelecionados] = useState<string[]>(
    []
  );
  const [origensSelecionadas, setOrigensSelecionadas] = useState<string[]>([]);

  const [setores, setSetores] = useState<ItemFiltro[]>([]);
  const [usuarios, setUsuarios] = useState<ItemFiltro[]>([]);
  const [tiposEquipamento, setTiposEquipamento] = useState<ItemFiltro[]>([]);
  const [modelos, setModelos] = useState<ItemFiltro[]>([]);
  const [contratos, setContratos] = useState<ItemFiltro[]>([]);
  const [origens, setOrigens] = useState<ItemFiltro[]>([]);

  async function carregarFiltros() {
    try {
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

      setSetores(Array.isArray(setoresData) ? setoresData : []);
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      setTiposEquipamento(Array.isArray(tiposData) ? tiposData : []);
      setModelos(Array.isArray(modelosData) ? modelosData : []);
      setContratos(Array.isArray(contratosData) ? contratosData : []);
      setOrigens(Array.isArray(origensData) ? origensData : []);
    } catch (error) {
      console.error("Erro ao carregar filtros:", error);
      setSetores([]);
      setUsuarios([]);
      setTiposEquipamento([]);
      setModelos([]);
      setContratos([]);
      setOrigens([]);
    }
  }

  async function carregarFuncionarioLogado() {
    try {
      const response = await fetch("/api/me");

      if (!response.ok) {
        setFuncionarioLogado(null);
        return;
      }

      const data = await response.json();
      setFuncionarioLogado(data.usuario ?? data.funcionario ?? null);
    } catch (error) {
      console.error("Erro ao carregar funcionário logado:", error);
      setFuncionarioLogado(null);
    }
  }

  async function carregarMaquinas(pageToLoad = page) {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (numeroSerie.trim()) {
        params.set("numero_serie", numeroSerie.trim());
      }

      setoresSelecionados.forEach((item) => params.append("setor", item));
      usuariosSelecionados.forEach((item) => params.append("usuario", item));
      tiposSelecionados.forEach((item) =>
        params.append("tipo_equipamento", item)
      );
      modelosSelecionados.forEach((item) => params.append("modelo", item));
      contratosSelecionados.forEach((item) => params.append("contrato", item));
      origensSelecionadas.forEach((item) => params.append("origem", item));

      params.set("page", String(pageToLoad));
      params.set("limit", String(limit));

      const url = `/api/maquinas-detalhadas?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();

      const maquinasCarregadas = Array.isArray(data.dados) ? data.dados : [];

      setMaquinas(maquinasCarregadas);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
      setPage(data.page ?? 1);
    } catch (error) {
      console.error("Erro ao carregar máquinas:", error);
      setMaquinas([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarFiltros();
    carregarMaquinas(1);
    carregarFuncionarioLogado();
  }, []);

  function handleFiltrar() {
    carregarMaquinas(1);
  }

  function handleLimpar() {
    setNumeroSerie("");
    setSetoresSelecionados([]);
    setUsuariosSelecionados([]);
    setTiposSelecionados([]);
    setModelosSelecionados([]);
    setContratosSelecionados([]);
    setOrigensSelecionadas([]);
    
    setLoading(true);

    fetch(`/api/maquinas-detalhadas?page=1&limit=${limit}`)
      .then((res) => res.json())
      .then((data) => {
        const maquinasCarregadas = Array.isArray(data.dados) ? data.dados : [];
        setMaquinas(maquinasCarregadas);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
        setPage(data.page ?? 1);
      })
      .catch((error) => {
        console.error("Erro ao limpar filtros:", error);
        setMaquinas([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function handlePaginaAnterior() {
    if (page > 1) {
      carregarMaquinas(page - 1);
    }
  }

  function handleProximaPagina() {
    if (page < totalPages) {
      carregarMaquinas(page + 1);
    }
  }

  function toggleSelecionada(id: number) {
    setSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function selecionarTodasVisiveis() {
    setSelecionadas((prev) => {
      const novas = maquinas
        .map((item) => item.id)
        .filter((id) => !prev.includes(id));

      return [...prev, ...novas];
    });
  }

  function limparSelecaoVisivel() {
    setSelecionadas((prev) =>
      prev.filter((id) => !maquinas.some((maquina) => maquina.id === id))
    );
  }

  function limparTodasSelecionadas() {
    setSelecionadas([]);
  }

  function paginaAtualEstaTodaSelecionada() {
    if (maquinas.length === 0) return false;
    return maquinas.every((maquina) => selecionadas.includes(maquina.id));
  }

  function togglePaginaAtual() {
    if (paginaAtualEstaTodaSelecionada()) {
      limparSelecaoVisivel();
    } else {
      selecionarTodasVisiveis();
    }
  }

  async function handleExportarSelecionadas() {
    if (selecionadas.length === 0) {
      alert("Selecione pelo menos uma máquina para exportar.");
      return;
    }

    setExportando(true);

    try {
      const response = await fetch("/api/maquinas/exportar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numeroSerie,
          setores: setoresSelecionados,
          usuarios: usuariosSelecionados,
          tiposEquipamento: tiposSelecionados,
          modelos: modelosSelecionados,
          contratos: contratosSelecionados,
          origens: origensSelecionadas,
          idsSelecionados: selecionadas,
          exportarTudoFiltrado: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.erro || "Erro ao exportar Excel.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "maquinas-selecionadas.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Não foi possível exportar o Excel.");
    } finally {
      setExportando(false);
    }
  }

  async function handleExportarTudoFiltrado() {
    setExportando(true);

    try {
      const response = await fetch("/api/maquinas/exportar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numeroSerie,
          setores: setoresSelecionados,
          usuarios: usuariosSelecionados,
          tiposEquipamento: tiposSelecionados,
          modelos: modelosSelecionados,
          contratos: contratosSelecionados,
          origens: origensSelecionadas,
          exportarTudoFiltrado: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.erro || "Erro ao exportar Excel.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "maquinas-filtradas.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Não foi possível exportar o Excel.");
    } finally {
      setExportando(false);
    }
  }

  async function handleSair() {
    try {
      setSaindo(true);

      const response = await fetch("/api/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Não foi possível sair do sistema.");
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Erro ao sair:", error);
      alert("Não foi possível sair do sistema.");
    } finally {
      setSaindo(false);
    }
  }

  const Paginacao = () => (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-gray-500">
        Mostrando página <strong>{page}</strong> de{" "}
        <strong>{totalPages || 1}</strong>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePaginaAnterior}
          disabled={page <= 1 || loading}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>

        <button
          onClick={handleProximaPagina}
          disabled={page >= totalPages || loading || totalPages === 0}
          className="rounded-lg border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Controle de Máquinas
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Gestão de inventário, filtros e exportação de relatórios.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/nova-maquina"
                className="inline-flex items-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
              >
                Nova Máquina
              </Link>

              {funcionarioLogado?.perfil === "master" && (
                <Link
                  href="/auditoria"
                  className="inline-flex items-center rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  Auditoria
                </Link>
              )}

              {funcionarioLogado?.perfil === "master" && (
                <Link
                  href="/funcionarios"
                  className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Funcionários
                </Link>
              )}

              <button
                onClick={handleSair}
                disabled={saindo}
                className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saindo ? "Saindo..." : "Sair"}
              </button>
            </div>
          </div>
        </section>

        {sucesso === "maquina-criada" && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700 shadow-sm">
            Máquina cadastrada com sucesso.
          </div>
        )}

        {sucesso === "maquina-editada" && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700 shadow-sm">
            Máquina atualizada com sucesso.
          </div>
        )}

        {sucesso === "maquina-excluida" && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700 shadow-sm">
            Máquina excluída com sucesso.
          </div>
        )}

        <section className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>
            <p className="text-sm text-slate-500">
              Refine a busca e exporte somente o que for necessário.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Número de Série
              </label>
              <input
                type="text"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2"
                placeholder="Digite o número de série"
              />
            </div>

            <MultiSelectFilter
              label="Setores"
              options={setores}
              selectedValues={setoresSelecionados}
              onChange={setSetoresSelecionados}
              placeholder="Buscar setor..."
            />

            <MultiSelectFilter
              label="Usuários"
              options={usuarios}
              selectedValues={usuariosSelecionados}
              onChange={setUsuariosSelecionados}
              placeholder="Buscar usuário..."
            />

            <MultiSelectFilter
              label="Tipos"
              options={tiposEquipamento}
              selectedValues={tiposSelecionados}
              onChange={setTiposSelecionados}
              placeholder="Buscar tipo..."
            />

            <MultiSelectFilter
              label="Modelos"
              options={modelos}
              selectedValues={modelosSelecionados}
              onChange={setModelosSelecionados}
              placeholder="Buscar modelo..."
            />

            <MultiSelectFilter
              label="Contratos"
              options={contratos}
              selectedValues={contratosSelecionados}
              onChange={setContratosSelecionados}
              placeholder="Buscar contrato..."
            />

            <MultiSelectFilter
              label="Origens"
              options={origens}
              selectedValues={origensSelecionadas}
              onChange={setOrigensSelecionadas}
              placeholder="Buscar origem..."
            />

            <div className="flex items-end gap-2">
              <button
                onClick={handleFiltrar}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Filtrar
              </button>

              <button
                onClick={handleLimpar}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Limpar
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">
                {loading
                  ? "Carregando registros..."
                  : `${total} registro(s) encontrado(s)`}
              </p>
              <p className="text-sm text-slate-500">
                <strong>{selecionadas.length}</strong> máquina(s) selecionada(s)
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={limparTodasSelecionadas}
                disabled={selecionadas.length === 0}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Limpar seleção
              </button>

              <button
                onClick={handleExportarSelecionadas}
                disabled={exportando || selecionadas.length === 0}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportando ? "Exportando..." : "Exportar selecionadas"}
              </button>

              <button
                onClick={handleExportarTudoFiltrado}
                disabled={exportando}
                className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportando ? "Exportando..." : "Exportar tudo do filtro"}
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <Paginacao />

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-900 text-left text-white">
                  <tr>
                    <th className="p-4">
                      <input
                        type="checkbox"
                        checked={paginaAtualEstaTodaSelecionada()}
                        onChange={togglePaginaAtual}
                      />
                    </th>
                    <th className="p-4 text-sm font-semibold">ID</th>
                    <th className="p-4 text-sm font-semibold">Número de Série</th>
                    <th className="p-4 text-sm font-semibold">Setor</th>
                    <th className="p-4 text-sm font-semibold">Usuário</th>
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
                      className="border-t border-slate-200 odd:bg-white even:bg-slate-50 hover:bg-blue-50"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selecionadas.includes(maquina.id)}
                          onChange={() => toggleSelecionada(maquina.id)}
                        />
                      </td>

                      <td className="p-4 text-sm text-slate-700">{maquina.id}</td>

                      <td className="p-4 text-sm font-semibold text-slate-900">
                        {maquina.numero_serie}
                      </td>

                      <td className="p-4 text-sm text-slate-700">
                        {maquina.setor ?? "-"}
                      </td>

                      <td className="p-4 text-sm text-slate-700">
                        {maquina.usuario ?? "-"}
                      </td>

                      <td className="p-4 text-sm text-slate-700">
                        {maquina.tipo_equipamento ?? "-"}
                      </td>

                      <td className="p-4 text-sm text-slate-700">
                        {maquina.modelo ?? "-"}
                      </td>

                      <td className="p-4 text-sm text-slate-700">
                        {maquina.contrato ?? "-"}
                      </td>

                      <td className="p-4 text-sm text-slate-700">
                        {maquina.origem ?? "-"}
                      </td>

                      <td className="p-4 text-sm text-slate-700">
                        {maquina.esset ?? "-"}
                      </td>

                      <td className="p-4">
                        <Link
                          href={`/editar-maquina/${maquina.id}`}
                          className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-amber-600"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {!loading && maquinas.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-10 text-center">
                        <div className="text-sm font-medium text-slate-700">
                          Nenhum registro encontrado.
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Ajuste os filtros ou limpe a busca para tentar novamente.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Paginacao />
        </section>
      </div>
    </main>
  );
}