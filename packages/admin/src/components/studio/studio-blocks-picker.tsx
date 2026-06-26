'use client'

import type { BlockCatalogEntry } from '@sistemazero/studio'
import { Input } from '@sistemazero/ui/input'
import { Spinner } from '@sistemazero/ui/spinner'
import { useEffect, useMemo, useState } from 'react'

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
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
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
          <p className="py-4 text-center text-muted-foreground text-xs">Nenhum bloco encontrado.</p>
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
                  </label>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
