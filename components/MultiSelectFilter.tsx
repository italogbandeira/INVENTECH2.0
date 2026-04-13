"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Estrutura de cada opção exibida no filtro.
 *
 * Exemplo de uso:
 * { id: 1, nome: "Setor Financeiro" }
 */
type Option = {
  id: number;
  nome: string;
};

/**
 * Propriedades esperadas pelo componente.
 *
 * - label: nome exibido acima do campo
 * - options: lista completa de opções disponíveis
 * - selectedValues: valores atualmente selecionados
 * - onChange: callback para atualizar a seleção no componente pai
 * - placeholder: texto exibido no campo de busca interno
 */
type Props = {
  label: string;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

/**
 * Componente de filtro com múltipla seleção e busca interna.
 *
 * Funcionalidades:
 * - abre/fecha dropdown
 * - busca por texto nas opções
 * - marca/desmarca itens individualmente
 * - seleciona todos os itens filtrados
 * - limpa os itens filtrados
 * - limpa toda a seleção
 *
 * Uso típico:
 * filtros de setores, usuários, contratos, modelos etc.
 */
export default function MultiSelectFilter({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "Buscar...",
}: Props) {
  /**
   * Controla se o dropdown está aberto.
   */
  const [open, setOpen] = useState(false);

  /**
   * Texto digitado na busca interna do filtro.
   */
  const [search, setSearch] = useState("");

  /**
   * Referência do container do componente.
   * Usada para detectar clique fora e fechar o dropdown.
   */
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Fecha o dropdown quando o usuário clica fora do componente.
   *
   * Esse comportamento melhora a UX e evita o filtro ficar aberto
   * indefinidamente na tela.
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Lista de opções filtradas pela busca interna.
   *
   * useMemo evita recalcular o filtro sem necessidade
   * quando options/search não mudarem.
   */
  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return options;

    return options.filter((option) =>
      option.nome.toLowerCase().includes(term)
    );
  }, [options, search]);

  /**
   * Indica se há uma busca ativa.
   *
   * Isso é usado para habilitar/desabilitar
   * os botões "Selecionar busca" e "Limpar busca".
   */
  const buscaAtiva = search.trim().length > 0;

  /**
   * Marca ou desmarca um valor individualmente.
   *
   * Se já estiver selecionado, remove.
   * Se não estiver, adiciona.
   */
  function toggleValue(value: string) {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value));
      return;
    }

    onChange([...selectedValues, value]);
  }

  /**
   * Seleciona todas as opções que estão visíveis no resultado da busca.
   *
   * Observação:
   * só funciona quando há termo de busca ativo.
   */
  function selecionarTodosFiltrados() {
    if (!buscaAtiva) return;

    const nomesFiltrados = filteredOptions.map((item) => item.nome);
    const novos = nomesFiltrados.filter(
      (nome) => !selectedValues.includes(nome)
    );

    onChange([...selectedValues, ...novos]);
  }

  /**
   * Remove da seleção apenas os itens visíveis no filtro atual.
   *
   * Útil quando o usuário quer desfazer uma seleção em bloco
   * sem limpar tudo.
   */
  function limparFiltrados() {
    if (!buscaAtiva) return;

    const filtrados = new Set(filteredOptions.map((item) => item.nome));
    onChange(selectedValues.filter((item) => !filtrados.has(item)));
  }

  /**
   * Remove toda a seleção do filtro.
   */
  function limparTodos() {
    onChange([]);
  }

  /**
   * Texto-resumo exibido no botão principal do filtro.
   *
   * Exemplos:
   * - "Nenhum selecionado"
   * - "Financeiro"
   * - "3 selecionados"
   */
  const resumo =
    selectedValues.length === 0
      ? "Nenhum selecionado"
      : selectedValues.length === 1
      ? selectedValues[0]
      : `${selectedValues.length} selecionados`;

  return (
    <div className="relative" ref={containerRef}>
      {/* Rótulo do filtro */}
      <label className="mb-1 block text-sm font-medium text-gray-800">
        {label}
      </label>

      {/* Botão principal que abre/fecha o dropdown */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-800 shadow-sm hover:border-gray-400"
      >
        <span className="truncate">{resumo}</span>
        <span className="ml-2 text-gray-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
          {/* Campo de busca interna */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Ações auxiliares do filtro */}
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selecionarTodosFiltrados}
              disabled={!buscaAtiva}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Selecionar busca
            </button>

            <button
              type="button"
              onClick={limparFiltrados}
              disabled={!buscaAtiva}
              className="rounded-md bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpar busca
            </button>

            <button
              type="button"
              onClick={limparTodos}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Limpar tudo
            </button>
          </div>

          {/* Lista das opções disponíveis */}
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
            {filteredOptions.length === 0 ? (
              <div className="text-sm text-gray-500">
                Nenhum resultado encontrado.
              </div>
            ) : (
              filteredOptions.map((option) => {
                const checked = selectedValues.includes(option.nome);

                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleValue(option.nome)}
                    />
                    <span className="text-sm text-gray-800">{option.nome}</span>
                  </label>
                );
              })
            )}
          </div>

          {/* Resumo visual dos itens selecionados */}
          {selectedValues.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedValues.map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
                >
                  {value}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}