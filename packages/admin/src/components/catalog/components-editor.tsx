'use client'

import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { ProductView } from '@/lib/types'
import { moveItem } from './product-picker-list'

export interface ComponentDraft {
  productId: string
  isPrimary: boolean
}

/**
 * Editor dos componentes de um COMBO (produto `kind=bundle`): quais produtos o
 * combo entrega, em que ordem, e qual é o principal (destacado na venda). As
 * regras do catálogo: sem repetir produto, sem o próprio combo, no máx. 1
 * principal — a UI previne; o backend valida de novo.
 */
export function ComponentsEditor({
  products,
  value,
  onChange,
  selfProductId,
}: {
  products: ProductView[]
  value: ComponentDraft[]
  onChange: (next: ComponentDraft[]) => void
  /** Id do próprio produto (edição) — não pode ser componente de si mesmo. */
  selfProductId?: string
}) {
  const used = new Set(value.map((c) => c.productId))
  const candidates = products.filter((p) => p.id !== selfProductId)
  const available = candidates.filter((p) => !used.has(p.id))
  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? id

  function add() {
    const first = available[0]
    if (!first) return
    onChange([...value, { productId: first.id, isPrimary: value.length === 0 }])
  }

  function setProduct(index: number, productId: string) {
    onChange(value.map((c, i) => (i === index ? { ...c, productId } : c)))
  }

  function setPrimary(index: number) {
    onChange(value.map((c, i) => ({ ...c, isPrimary: i === index })))
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function move(index: number, dir: -1 | 1) {
    const next = moveItem(value, index, dir)
    if (next) onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Nenhum componente. Adicione os produtos que este combo entrega.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {value.map((c, i) => (
            <li key={c.productId} className="flex items-center gap-2">
              <Select
                aria-label="Produto do componente"
                className="flex-1"
                value={c.productId}
                onChange={(e) => setProduct(i, e.target.value)}
              >
                <option value={c.productId}>{nameOf(c.productId)}</option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="radio"
                  name="combo-primary"
                  checked={c.isPrimary}
                  onChange={() => setPrimary(i)}
                  className="size-3.5 accent-[color:var(--primary)]"
                />
                Principal
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Mover para cima"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Mover para baixo"
                disabled={i === value.length - 1}
                onClick={() => move(i, 1)}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remover componente"
                onClick={() => remove(i)}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={available.length === 0}
        className="self-start"
      >
        <Plus className="size-4" /> Adicionar componente
      </Button>
    </div>
  )
}
