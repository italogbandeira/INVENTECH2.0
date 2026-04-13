"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Dados básicos do usuário exibidos na tela de detalhe.
 */
type Usuario = {
  id: number;
  nome: string;
  login_email: string | null;
  login_maquina: string | null;
};

/**
 * Estrutura de máquina vinculada ou disponível para vínculo.
 */
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

/**
 * Estrutura dos documentos anexados ao usuário.
 */
type DocumentoUsuario = {
  id: number;
  usuarioId: number;
  tipo: string;
  nomeArquivo: string;
  caminho: string;
  createdAt: string;
};

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Tipos de documentos obrigatórios tratados pela UI.
 *
 * Cada item define:
 * - tipo técnico salvo no banco
 * - título amigável
 * - descrição exibida ao operador
 */
const TIPOS_DOCUMENTO = [
  {
    tipo: "cessao_indeterminada",
    titulo: "Termo de Cessão de Equip. - Tempo Indeterminado",
    descricao: "Documento obrigatório para cessão permanente do equipamento.",
  },
  {
    tipo: "devolucao_equipamento",
    titulo: "Termo de Devolução de Equipamento",
    descricao: "Documento obrigatório para devolução formal do equipamento.",
  },
  {
    tipo: "cessao_temporaria",
    titulo: "Termo de Cessão Temporária de Equipamento",
    descricao: "Documento obrigatório para cessão temporária do equipamento.",
  },
] as const;

/**
 * Página de detalhe de usuário.
 *
 * Responsabilidades:
 * - carregar dados básicos do usuário
 * - listar máquinas vinculadas
 * - permitir vincular e remover vínculo
 * - listar documentos anexados
 * - permitir upload, substituição e remoção de documentos
 * - exibir mensagens de erro e sucesso
 */
export default function UsuarioDetalhePage({ params }: Props) {
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  /**
   * Máquinas já vinculadas ao usuário.
   */
  const [maquinas, setMaquinas] = useState<MaquinaVinculada[]>([]);

  /**
   * Máquinas disponíveis para novo vínculo.
   */
  const [maquinasDisponiveis, setMaquinasDisponiveis] = useState<
    MaquinaVinculada[]
  >([]);

  /**
   * ID da máquina escolhida no select para vincular.
   */
  const [maquinaSelecionada, setMaquinaSelecionada] = useState("");

  /**
   * Lista de documentos atualmente cadastrados para o usuário.
   */
  const [documentos, setDocumentos] = useState<DocumentoUsuario[]>([]);

  /**
   * Estados de controle da tela.
   */
  const [loading, setLoading] = useState(true);
  const [salvandoVinculo, setSalvandoVinculo] = useState(false);
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
  const [removendoDocumentoId, setRemovendoDocumentoId] = useState<number | null>(
    null
  );

  /**
   * Mensagens exibidas ao usuário.
   */
  const [erro, setErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  /**
   * Referências para os inputs de arquivo escondidos.
   *
   * Isso permite abrir o seletor de arquivos através de botões customizados.
   */
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /**
   * Carrega os documentos anexados ao usuário.
   */
  async function carregarDocumentos(id: string) {
    const response = await fetch(`/api/usuarios/${id}/documentos`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.erro || "Erro ao carregar documentos.");
    }

    setDocumentos(Array.isArray(data.documentos) ? data.documentos : []);
  }

  /**
   * Carrega todos os dados necessários da tela:
   * - usuário
   * - máquinas vinculadas
   * - máquinas disponíveis
   * - documentos
   */
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
      setMaquinas(
        Array.isArray(maquinasData.vinculadas) ? maquinasData.vinculadas : []
      );
      setMaquinasDisponiveis(
        Array.isArray(maquinasData.disponiveis) ? maquinasData.disponiveis : []
      );

      await carregarDocumentos(id);
    } catch (error) {
      console.error(error);

      setErro("Não foi possível carregar o detalhe do usuário.");
      setUsuario(null);
      setMaquinas([]);
      setMaquinasDisponiveis([]);
      setDocumentos([]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Carregamento inicial da página.
   */
  useEffect(() => {
    carregarDetalhe();
  }, [params]);

  /**
   * Faz a mensagem de sucesso desaparecer automaticamente
   * alguns segundos após ser exibida.
   */
  useEffect(() => {
    if (!mensagemSucesso) return;

    const timeout = setTimeout(() => {
      setMensagemSucesso("");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [mensagemSucesso]);

  /**
   * Vincula uma máquina disponível ao usuário atual.
   */
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
      setMensagemSucesso("Máquina vinculada com sucesso.");
      await carregarDetalhe();
    } catch (error) {
      console.error(error);
      alert("Não foi possível vincular a máquina.");
    } finally {
      setSalvandoVinculo(false);
    }
  }

  /**
   * Remove o vínculo entre uma máquina e o usuário.
   *
   * Exige confirmação antes de executar.
   */
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

      setMensagemSucesso("Vínculo removido com sucesso.");
      await carregarDetalhe();
    } catch (error) {
      console.error(error);
      alert("Não foi possível remover o vínculo da máquina.");
    } finally {
      setSalvandoVinculo(false);
    }
  }

  /**
   * Faz upload de um documento para um tipo específico.
   *
   * Observação:
   * a regra de persistência e substituição real depende da API.
   * A UI apenas envia o arquivo selecionado para o backend.
   */
  async function handleUploadDocumento(tipo: string, file: File | null) {
    if (!file || !usuarioId) return;

    try {
      setUploadingTipo(tipo);
      setErro("");
      setMensagemSucesso("");

      const formData = new FormData();
      formData.append("tipo", tipo);
      formData.append("arquivo", file);

      const response = await fetch(`/api/usuarios/${usuarioId}/documentos`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.erro || "Erro ao enviar documento.");
      }

      setMensagemSucesso("Documento enviado com sucesso.");
      await carregarDetalhe();
    } catch (error) {
      console.error(error);
      setErro("Não foi possível enviar o documento.");
    } finally {
      setUploadingTipo(null);

      /**
       * Limpa o input de arquivo para permitir reenviar o mesmo arquivo,
       * se necessário, em uma próxima tentativa.
       */
      if (inputRefs.current[tipo]) {
        inputRefs.current[tipo]!.value = "";
      }
    }
  }

  /**
   * Remove um documento já anexado ao usuário.
   */
  async function handleRemoverDocumento(documentoId: number) {
    if (!usuarioId) return;

    const confirmar = window.confirm("Deseja remover este documento?");
    if (!confirmar) return;

    try {
      setRemovendoDocumentoId(documentoId);
      setErro("");
      setMensagemSucesso("");

      const response = await fetch(
        `/api/usuarios/${usuarioId}/documentos/${documentoId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.erro || "Erro ao remover documento.");
      }

      setMensagemSucesso("Documento removido com sucesso.");
      await carregarDetalhe();
    } catch (error) {
      console.error(error);
      setErro("Não foi possível remover o documento.");
    } finally {
      setRemovendoDocumentoId(null);
    }
  }

  /**
   * Retorna o documento correspondente a um tipo específico.
   *
   * Exemplo:
   * - cessao_indeterminada
   * - devolucao_equipamento
   * - cessao_temporaria
   */
  function obterDocumentoPorTipo(tipo: string) {
    return documentos.find((documento) => documento.tipo === tipo) ?? null;
  }

  /**
   * Formata data/hora para exibição local.
   */
  function formatarData(data: string) {
    return new Date(data).toLocaleString("pt-BR");
  }

  /**
   * Dispara programaticamente o input de arquivo escondido.
   */
  function abrirSeletorArquivo(tipo: string) {
    inputRefs.current[tipo]?.click();
  }

  /**
   * Resumo documental para exibição na UI.
   */
  const totalObrigatorios = TIPOS_DOCUMENTO.length;
  const totalAnexados = TIPOS_DOCUMENTO.filter((item) =>
    obterDocumentoPorTipo(item.tipo)
  ).length;
  const totalPendentes = totalObrigatorios - totalAnexados;

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Cabeçalho da página */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Detalhe do usuário
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Visualize as informações do usuário, as máquinas vinculadas e os
                documentos anexados.
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

        {/* Mensagens da tela */}
        {erro && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
            {erro}
          </section>
        )}

        {mensagemSucesso && (
          <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700 shadow-sm">
            {mensagemSucesso}
          </section>
        )}

        {/* Informações e vínculo de máquinas */}
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
                    <p className="mt-1 text-sm text-slate-900">
                      {usuario.nome}
                    </p>
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
            {/* Card de vínculo de nova máquina */}
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
                      {maquina.numero_serie} — {maquina.setor} —{" "}
                      {maquina.tipo_equipamento} — {maquina.modelo}
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

            {/* Tabela de máquinas já vinculadas */}
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
                      <th className="p-4 text-sm font-semibold">
                        Número de série
                      </th>
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
                        <td className="p-4 text-sm text-slate-700">
                          {maquina.id}
                        </td>

                        <td className="p-4 text-sm font-medium text-slate-900">
                          {maquina.numero_serie}
                        </td>

                        <td className="p-4 text-sm text-slate-700">
                          {maquina.setor}
                        </td>

                        <td className="p-4 text-sm text-slate-700">
                          {maquina.tipo_equipamento}
                        </td>

                        <td className="p-4 text-sm text-slate-700">
                          {maquina.modelo}
                        </td>

                        <td className="p-4 text-sm text-slate-700">
                          {maquina.contrato}
                        </td>

                        <td className="p-4 text-sm text-slate-700">
                          {maquina.origem}
                        </td>

                        <td className="p-4 text-sm text-slate-700">
                          {maquina.esset}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() =>
                              handleRemoverVinculo(
                                maquina.id,
                                maquina.numero_serie
                              )
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

        {/* Bloco de documentos */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Documentos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Faça upload, substituição e remoção dos anexos do usuário.
              </p>
            </div>

            {/* Resumo rápido da situação documental */}
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Obrigatórios: {totalObrigatorios}
              </span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                Anexados: {totalAnexados}
              </span>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                Pendentes: {totalPendentes}
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
            {TIPOS_DOCUMENTO.map((item) => {
              const documento = obterDocumentoPorTipo(item.tipo);
              const estaEnviando = uploadingTipo === item.tipo;
              const removendoEste = removendoDocumentoId === documento?.id;

              return (
                <div
                  key={item.tipo}
                  className={`rounded-2xl border p-5 shadow-sm transition ${
                    documento
                      ? "border-green-200 bg-green-50/40"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.titulo}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.descricao}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        documento
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {documento ? "Anexado" : "Pendente"}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    {documento ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Arquivo atual
                          </p>
                          <a
                            href={documento.caminho}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block break-all text-sm font-medium text-blue-600 hover:underline"
                          >
                            {documento.nomeArquivo}
                          </a>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Enviado em
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {formatarData(documento.createdAt)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <a
                            href={documento.caminho}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                          >
                            Visualizar
                          </a>

                          <button
                            type="button"
                            onClick={() => abrirSeletorArquivo(item.tipo)}
                            disabled={estaEnviando}
                            className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-black shadow-sm hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {estaEnviando ? "Enviando..." : "Substituir"}
                          </button>

                          <button
                            onClick={() => handleRemoverDocumento(documento.id)}
                            disabled={removendoEste}
                            className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {removendoEste ? "Removendo..." : "Remover"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-600">
                          Nenhum documento anexado até o momento.
                        </p>

                        <button
                          type="button"
                          onClick={() => abrirSeletorArquivo(item.tipo)}
                          disabled={estaEnviando}
                          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {estaEnviando ? "Enviando..." : "Selecionar arquivo"}
                        </button>

                        <p className="text-xs text-slate-500">
                          Formatos aceitos: PDF, DOC, DOCX, PNG, JPG e JPEG.
                        </p>
                      </div>
                    )}

                    {/* Input escondido para upload controlado por botão customizado */}
                    <input
                      ref={(el) => {
                        inputRefs.current[item.tipo] = el;
                      }}
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) =>
                        handleUploadDocumento(
                          item.tipo,
                          e.target.files?.[0] ?? null
                        )
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}