'use client'

import { Input } from '@sistemazero/ui/input'
import { Spinner } from '@sistemazero/ui/spinner'
import { Search } from 'lucide-react'
import { useState } from 'react'

export interface OfferOption {
  id: string
  label: string
}

/**
 * Multi-select leve de ofertas (lista de checkboxes com busca client-side).
 * Usado no cupom quando "vale para todas as ofertas" está desmarcado.
 */
export function OffersMultiSelect({
  options,
  value,
  onChange,
  loading = false,
}: {
  options: OfferOption[]
  value: string[]
  onChange: (ids: string[]) => void
  loading?: boolean
}) {
  const [filter, setFilter] = useState('')
  const selected = new Set(value)
  const visible = filter.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase()))
    : options

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    // Preserva a ordem das opções (estável p/ comparar/enviar).
    onChange(options.filter((o) => next.has(o.id)).map((o) => o.id))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filtrar ofertas…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {options.length === 0 ? 'Nenhuma oferta cadastrada.' : 'Nenhuma oferta encontrada.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((o) => (
              <li key={o.id}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                    className="size-4 accent-[color:var(--primary)]"
                  />
                  {o.label}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {value.length === 0
          ? 'Nenhuma oferta selecionada.'
          : `${value.length} oferta(s) selecionada(s).`}
      </p>
    </div>
  )
}
