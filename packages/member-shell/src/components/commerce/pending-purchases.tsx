'use client'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'
import type { PendingPurchaseView } from '../../lib/commerce'
import { CommercePanel } from './commerce-panel'

export function PendingPurchases() {
  const [items, setItems] = useState<PendingPurchaseView[]>([])
  const [selected, setSelected] = useState<PendingPurchaseView | null>(null)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    apiGet<{ items: PendingPurchaseView[] }>(
      `/api/commerce/pending?revision=${revision}`,
      undefined,
      {
        signal: controller.signal,
      },
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setItems(result.items)
          setError(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
    return () => controller.abort()
  }, [revision])
  if (error)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Não foi possível conferir suas compras em andamento.{' '}
        <button type="button" className="underline" onClick={refresh}>
          Tentar novamente
        </button>
      </p>
    )
  if (!items.length && !selected) return null
  return (
    <section aria-label="Compras em andamento" className="flex flex-col gap-4">
      <h2 className="font-bold text-lg">Compras em andamento</h2>
      {items.map((item) => (
        <div
          key={item.checkoutId}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground"
        >
          <p className="font-semibold">{item.title}</p>
          <Button variant="outline" onClick={() => setSelected(item)}>
            Acompanhar compra
          </Button>
        </div>
      ))}
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Sua compra'}
        className="max-w-xl"
      >
        {selected ? (
          <CommercePanel
            origin={selected.origin}
            checkoutId={selected.checkoutId}
            title={selected.title}
            onUpdated={refresh}
          />
        ) : null}
      </Dialog>
    </section>
  )
}
