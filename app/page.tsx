"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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
  const [maquinas, setMaquinas] = useState<MaquinaDetalhada[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [funcionarioLogado, setFuncionarioLogado] =
  useState<FuncionarioLogado | null>(null);
  const searchParams = useSearchParams();
  const sucesso = searchParams.get("sucesso");

  const [numeroSerie, setNumeroSerie] = useState("");
  const [setor, setSetor] = useState("");
  const [usuario, setUsuario] = useState("");
  const [tipoEquipamento, setTipoEquipamento] = useState("");
  const [modelo, setModelo] = useState("");
  const [contrato, setContrato] = useState("");
  const [origem, setOrigem] = useState("");

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

      setSetores(setoresData);
      setUsuarios(usuariosData);
      setTiposEquipamento(tiposData);
      setModelos(modelosData);
      setContratos(contratosData);
      setOrigens(origensData);
    } catch (error) {
      console.error("Erro ao carregar filtros:", error);
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

      if (numeroSerie.trim()) params.set("numero_serie", numeroSerie.trim());
      if (setor.trim()) params.set("setor", setor.trim());
      if (usuario.trim()) params.set("usuario", usuario.trim());
      if (tipoEquipamento.trim()) {
        params.set("tipo_equipamento", tipoEquipamento.trim());
      }
      if (modelo.trim()) params.set("modelo", modelo.trim());
      if (contrato.trim()) params.set("contrato", contrato.trim());
      if (origem.trim()) params.set("origem", origem.trim());

      params.set("page", String(pageToLoad));
      params.set("limit", String(limit));

      const url = `/api/maquinas-detalhadas?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();

      setMaquinas(data.dados ?? []);
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
    setSetor("");
    setUsuario("");
    setTipoEquipamento("");
    setModelo("");
    setContrato("");
    setOrigem("");
    setLoading(true);

    fetch(`/api/maquinas-detalhadas?page=1&limit=${limit}`)
      .then((res) => res.json())
      .then((data) => {
        setMaquinas(data.dados ?? []);
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

  const Paginacao = () => (
    <div className="my-4 flex items-center gap-3">
      <button
        onClick={handlePaginaAnterior}
        disabled={page <= 1 || loading}
        className="rounded-lg bg-gray-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Anterior
      </button>

      <span className="text-sm text-gray-700">
        Página {page} de {totalPages || 1}
      </span>

      <button
        onClick={handleProximaPagina}
        disabled={page >= totalPages || loading || totalPages === 0}
        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Próxima
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          Controle de Máquinas
        </h1>

        <div className="mb-4 flex gap-2">
  <Link
    href="/nova-maquina"
    className="inline-block rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
  >
    Nova Máquina
  </Link>

  {funcionarioLogado?.perfil === "master" && (
    <Link
      href="/funcionarios"
      className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
    >
      Funcionários
    </Link>
  )}
</div>

        {sucesso === "maquina-criada" && (
          <div className="mb-4 rounded-lg bg-green-100 p-3 text-green-700">
            Máquina cadastrada com sucesso.
          </div>
        )}

        {sucesso === "maquina-editada" && (
          <div className="mb-4 rounded-lg bg-green-100 p-3 text-green-700">
            Máquina atualizada com sucesso.
          </div>
        )}

        {sucesso === "maquina-excluida" && (
          <div className="mb-4 rounded-lg bg-green-100 p-3 text-green-700">
            Máquina excluída com sucesso.
          </div>
        )}

        <div className="mb-6 rounded-xl bg-white p-4 shadow-md">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Número de Série
              </label>
              <input
                type="text"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
                placeholder="Digite o número de série"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Setor</label>
              <select
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              >
                <option value="">Todos</option>
                {setores.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Usuário</label>
              <select
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              >
                <option value="">Todos</option>
                {usuarios.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Tipo</label>
              <select
                value={tipoEquipamento}
                onChange={(e) => setTipoEquipamento(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              >
                <option value="">Todos</option>
                {tiposEquipamento.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Modelo</label>
              <select
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              >
                <option value="">Todos</option>
                {modelos.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Contrato</label>
              <select
                value={contrato}
                onChange={(e) => setContrato(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              >
                <option value="">Todos</option>
                {contratos.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Origem</label>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2"
              >
                <option value="">Todos</option>
                {origens.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handleFiltrar}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Filtrar
              </button>

              <button
                onClick={handleLimpar}
                className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>

        <div className="mb-3 text-sm text-gray-600">
          {loading
            ? "Carregando..."
            : `${total} registro(s) encontrado(s) | Página ${page} de ${
                totalPages || 1
              }`}
        </div>

        <Paginacao />

        <div className="overflow-x-auto rounded-xl bg-white shadow-md">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-left text-white">
                <th className="p-3">ID</th>
                <th className="p-3">Número de Série</th>
                <th className="p-3">Setor</th>
                <th className="p-3">Usuário</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Modelo</th>
                <th className="p-3">Contrato</th>
                <th className="p-3">Origem</th>
                <th className="p-3">ESSET</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {maquinas.map((maquina) => (
                <tr
                  key={maquina.id}
                  className="border-t border-gray-200 odd:bg-white even:bg-gray-50 hover:bg-blue-50"
                >
                  <td className="p-3">{maquina.id}</td>
                  <td className="p-3 font-medium">{maquina.numero_serie}</td>
                  <td className="p-3">{maquina.setor ?? "-"}</td>
                  <td className="p-3">{maquina.usuario ?? "-"}</td>
                  <td className="p-3">{maquina.tipo_equipamento ?? "-"}</td>
                  <td className="p-3">{maquina.modelo ?? "-"}</td>
                  <td className="p-3">{maquina.contrato ?? "-"}</td>
                  <td className="p-3">{maquina.origem ?? "-"}</td>
                  <td className="p-3">{maquina.esset ?? "-"}</td>
                  <td className="p-3">
                    <Link
                      href={`/editar-maquina/${maquina.id}`}
                      className="inline-flex min-w-[88px] items-center justify-center rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-black shadow-sm hover:bg-amber-600"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}

              {!loading && maquinas.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-gray-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Paginacao />
      </div>
    </main>
  );
}