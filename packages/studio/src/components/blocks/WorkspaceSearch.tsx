import type * as Blockly from 'blockly/core'
import type { JSX } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { searchWorkspaceBlocks, type WorkspaceSearchResult } from '../../blockly/workspaceSearch'
import { createDictionaryTranslator } from '../../core/i18n/translator'
import { useT } from '../../studio/i18n'
import { IconSearch } from '../../ui-internal/icons'

/**
 * Procurar no programa (lote 3 da missão, 21/11/2026): o campo no canto da área de blocos, só em
 * projeto grande (`WORKSPACE_SEARCH_MIN_BLOCKS`). Cada resultado leva ao "Mostrar o bloco" de
 * sempre (`onReveal`), que centraliza o bloco e desenha a cauda adiada até ele. Carregado sob
 * demanda pelo `BlocklyPanel`, com os próprios textos: fica fora do pacote de abertura do modo
 * Blocos e do dicionário da carga inicial.
 */
export interface WorkspaceSearchProps {
  workspace: Blockly.Workspace
  onReveal: (blockId: string) => void
  /** Pedido de abrir vindo do atalho (Ctrl+F na área de blocos); muda a cada pedido. */
  openRequest: number
}

const COPY = {
  'pt-BR': {
    open: 'Procurar no programa',
    placeholder: 'Procurar nos blocos do programa',
    close: 'Fechar a busca',
    none: 'Nenhum bloco com esse texto',
    one: '1 bloco',
    many: '{total} blocos',
    someOf: 'Os primeiros {shown} de {total} blocos',
    draft: 'Fora das áreas',
  },
  en: {
    open: 'Search the program',
    placeholder: 'Search the program blocks',
    close: 'Close search',
    none: 'No block with that text',
    one: '1 block',
    many: '{total} blocks',
    someOf: 'The first {shown} of {total} blocks',
    draft: 'Outside the areas',
  },
}

const EMPTY: WorkspaceSearchResult = { hits: [], total: 0 }

export default function WorkspaceSearch({
  workspace,
  onReveal,
  openRequest,
}: WorkspaceSearchProps): JSX.Element {
  const studioT = useT()
  const t = useMemo(
    () => createDictionaryTranslator(COPY, studioT.locale ?? 'pt-BR'),
    [studioT.locale],
  )
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()

  useEffect(() => {
    if (openRequest > 0) setOpen(true)
  }, [openRequest])
  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  // Procura no modelo vivo a cada texto novo.
  const result = useMemo(
    () => (open && query.trim() ? searchWorkspaceBlocks(workspace, query) : EMPTY),
    [open, query, workspace],
  )

  const reveal = (id: string) => {
    setActive(id)
    onReveal(id)
  }

  if (!open)
    return (
      <button
        type="button"
        data-sz-workspace-search=""
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border-2 border-sz-border bg-sz-panel px-3 py-1.5 font-semibold text-sm text-sz-fg shadow-sm hover:bg-sz-panel-soft"
        onClick={() => setOpen(true)}
      >
        <IconSearch aria-hidden="true" className="h-4 w-4" />
        <span>{t('open')}</span>
      </button>
    )

  return (
    <search
      data-sz-workspace-search=""
      className="pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-2xl border-2 border-sz-border bg-sz-panel p-2 text-sz-fg shadow-lg"
    >
      <div className="flex items-center gap-2 rounded-xl bg-sz-bg px-2">
        <IconSearch aria-hidden="true" className="h-4 w-4 shrink-0 text-sz-fg-soft" />
        <input
          ref={input}
          type="search"
          value={query}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          aria-controls={listId}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-sz-fg outline-none"
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              setOpen(false)
            } else if (event.key === 'Enter' && result.hits.length > 0) {
              // Enter anda pelos resultados, um de cada vez.
              event.preventDefault()
              const at = result.hits.findIndex((hit) => hit.id === active)
              const next = result.hits[(at + 1) % result.hits.length]
              if (next) reveal(next.id)
            }
          }}
        />
        <button
          type="button"
          aria-label={t('close')}
          className="rounded-full px-2 py-1 text-sz-fg-soft hover:text-sz-fg"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
      </div>
      {query.trim() ? (
        <>
          <output aria-live="polite" className="px-1 text-xs font-semibold text-sz-fg-soft">
            {result.total === 0
              ? t('none')
              : result.total > result.hits.length
                ? t('someOf', { shown: result.hits.length, total: result.total })
                : result.total === 1
                  ? t('one')
                  : t('many', { total: result.total })}
          </output>
          {result.hits.length > 0 ? (
            <ul
              id={listId}
              className="m-0 flex max-h-72 list-none flex-col gap-1 overflow-y-auto p-0"
            >
              {result.hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    aria-current={hit.id === active ? 'true' : undefined}
                    className="flex w-full flex-col items-start rounded-xl px-2 py-1.5 text-left hover:bg-sz-panel-soft aria-[current=true]:bg-sz-panel-soft"
                    onClick={() => reveal(hit.id)}
                  >
                    <span className="line-clamp-2 text-sm">{hit.text}</span>
                    <span className="text-xs text-sz-fg-soft">{hit.area ?? t('draft')}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </search>
  )
}
