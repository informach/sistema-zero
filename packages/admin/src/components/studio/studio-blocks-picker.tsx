'use client'

import type { BlockCatalogEntry } from '@sistemazero/studio'
import { Input } from '@sistemazero/ui/input'
import { Spinner } from '@sistemazero/ui/spinner'
import { Tabs } from '@sistemazero/ui/tabs'
import { useEffect, useMemo, useState } from 'react'
import { JsonImportPanel } from '@/components/admin/json-import-panel'
import { parseStudioBlocksImport } from '@/lib/lesson-block-import'

/**
 * Picker da "lista de blocos" da aula (`allowBlocks` restritivo do bloco Estúdio):
 * busca + grupos por categoria. O catálogo de blocos PUXA o Blockly, então é carregado
 * DINÂMICO (mesmo chunk do StudioEmbed do form) — não pesa a página de edição de aula.
 */
export function StudioBlocksPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [catalog, setCatalog] = useState<readonly BlockCatalogEntry[] | null>(null)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'manual' | 'import'>('manual')

  useEffect(() => {
    let active = true
    void import('@sistemazero/studio').then((mod) => {
      if (active) setCatalog(mod.BLOCK_CATALOG)
    })
    return () => {
      active = false
    }
  }, [])

  const selected = useMemo(() => new Set(value), [value])

  // Rótulos que se REPETEM dentro da mesma categoria (ex.: "Tocar som de explosão" existe em 2
  // kits do Jogo 2D) — pra esses mostramos o id ao lado, senão ficam idênticos na lista.
  const dupKeys = useMemo(() => {
    const count = new Map<string, number>()
    for (const e of catalog ?? []) {
      const k = `${e.category}\n${e.label}`
      count.set(k, (count.get(k) ?? 0) + 1)
    }
    return new Set([...count.entries()].filter(([, n]) => n > 1).map(([k]) => k))
  }, [catalog])

  // Agrupa por categoria, filtrando pela busca (rótulo OU id).
  const groups = useMemo(() => {
    if (!catalog) return [] as [string, BlockCatalogEntry[]][]
    const q = query.trim().toLowerCase()
    const byCat = new Map<string, BlockCatalogEntry[]>()
    for (const e of catalog) {
      if (q && !e.label.toLowerCase().includes(q) && !e.type.toLowerCase().includes(q)) continue
      const arr = byCat.get(e.category) ?? []
      arr.push(e)
      byCat.set(e.category, arr)
    }
    return [...byCat.entries()]
  }, [catalog, query])

  const importExample = useMemo(
    () => ({ blocks: (catalog ?? []).slice(0, 2).map((entry) => entry.type) }),
    [catalog],
  )
  const catalogDownload = useMemo(
    () => ({
      blocks: (catalog ?? []).map((entry) => ({
        id: entry.type,
        label: entry.label,
        category: entry.category,
      })),
    }),
    [catalog],
  )

  function toggle(type: string) {
    const next = new Set(value)
    if (next.has(type)) next.delete(type)
    else next.add(type)
    onChange([...next])
  }

  if (!catalog) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-muted-foreground text-sm">
        <Spinner /> Carregando os blocos…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Tabs
        value={mode}
        onChange={(next) => setMode(next as 'manual' | 'import')}
        items={[
          { value: 'manual', label: 'Manual' },
          { value: 'import', label: 'Importar JSON' },
        ]}
      />

      {mode === 'import' ? (
        <div role="tabpanel" aria-label="Importar lista de blocos por JSON">
          <JsonImportPanel
            parse={(text) => parseStudioBlocksImport(text, catalog)}
            example={importExample}
            exampleFilename="modelo-blocos-studio.json"
            extraDownloads={[
              {
                label: 'Baixar catálogo atual',
                filename: 'catalogo-blocos-studio.json',
                data: catalogDownload,
              },
            ]}
            hasExistingContent={value.length > 0}
            successMessage="Lista de blocos importada. Revise e salve o bloco."
            guide={
              <div className="space-y-2 text-muted-foreground">
                <p>
                  Use JSON em UTF-8 com uma lista de 1 a 500 IDs únicos. Todos precisam existir no
                  catálogo atual do Estúdio.
                </p>
                <p>
                  O modelo é importável. O catálogo baixável é apenas uma referência com ID, rótulo
                  e categoria de cada bloco disponível.
                </p>
              </div>
            }
            renderPreview={(imported) => {
              const byCategory = new Map<string, BlockCatalogEntry[]>()
              const entriesById = new Map(catalog.map((entry) => [entry.type, entry]))
              for (const id of imported.blocks) {
                const entry = entriesById.get(id)
                if (!entry) continue
                const entries = byCategory.get(entry.category) ?? []
                entries.push(entry)
                byCategory.set(entry.category, entries)
              }
              return (
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>{imported.blocks.length}</strong> bloco(s) serão selecionados.
                  </p>
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {[...byCategory.entries()].map(([category, entries]) => (
                      <div key={category}>
                        <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                          {category}
                        </p>
                        <ul className="mt-1 space-y-1">
                          {entries.map((entry) => (
                            <li key={entry.type} className="flex flex-wrap gap-x-2">
                              <span>{entry.label}</span>
                              <code className="text-muted-foreground text-xs">{entry.type}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }}
            onApply={(imported) => {
              onChange(imported.blocks)
              setMode('manual')
            }}
          />
        </div>
      ) : (
        <div
          role="tabpanel"
          aria-label="Selecionar blocos manualmente"
          className="flex flex-col gap-2 rounded-lg border border-border p-3"
        >
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar bloco…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <span className="shrink-0 text-muted-foreground text-xs">
              {value.length} selecionado(s)
            </span>
            {value.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="shrink-0 text-primary text-xs hover:underline"
              >
                Limpar
              </button>
            ) : null}
          </div>
          <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
            {groups.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-xs">
                Nenhum bloco encontrado.
              </p>
            ) : (
              groups.map(([cat, entries]) => (
                <div key={cat}>
                  <p className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    {cat}
                  </p>
                  <div className="flex flex-col gap-1">
                    {entries.map((e) => (
                      <label key={e.type} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 accent-primary"
                          checked={selected.has(e.type)}
                          onChange={() => toggle(e.type)}
                        />
                        <span className="truncate" title={e.type}>
                          {e.label}
                        </span>
                        {dupKeys.has(`${cat}\n${e.label}`) ? (
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {e.type}
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
