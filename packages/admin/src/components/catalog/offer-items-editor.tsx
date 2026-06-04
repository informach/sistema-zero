'use client'

import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import type { ProductView } from '@/lib/types'
import { moveItem } from './product-picker-list'

export interface OfferItemDraft {
  productId: string
}

/**
 * Editor dos ITENS EXTRAS (bônus) de uma oferta: produtos entregues junto, além
 * do principal. No modelo do catálogo, "bônus" não é entidade — material que
 * varia por oferta entra em `offer_items`; "BÔNUS" é só rótulo de copy no funil.
 */
export function OfferItemsEditor({
  products,
  value,
  onChange,
  mainProductId,
}: {
  products: ProductView[]
  value: OfferItemDraft[]
  onChange: (next: OfferItemDraft[]) => void
  /** Produto principal da oferta — já entregue; não repetir como extra. */
  mainProductId?: string
}) {
  const used = new Set(value.map((c) => c.productId))
  const candidates = products.filter((p) => p.id !== mainProductId)
  const available = candidates.filter((p) => !used.has(p.id))
  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? id

  function add() {
    const first = available[0]
    if (!first) return
    onChange([...value, { productId: first.id }])
  }

  function setProduct(index: number, productId: string) {
    onChange(value.map((c, i) => (i === index ? { ...c, productId } : c)))
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
          Nenhum item extra. Adicione produtos entregues como bônus desta oferta.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {value.map((c, i) => (
            <li key={c.productId} className="flex items-center gap-2">
              <Select
                aria-label="Produto do item extra"
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
                aria-label="Remover item"
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
        <Plus className="size-4" /> Adicionar item extra
      </Button>
    </div>
  )
}
