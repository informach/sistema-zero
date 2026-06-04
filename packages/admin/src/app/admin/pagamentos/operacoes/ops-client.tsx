'use client'

import { Button } from '@sistemazero/ui/button'
import { Spinner } from '@sistemazero/ui/spinner'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { OverviewCard } from '@/components/admin/overview-card'
import { PaymentsTabs } from '@/components/admin/payments-tabs'
import { type ApiError, apiGet } from '@/lib/api'
import type { PaymentOps } from '@/lib/types'

export function OpsClient() {
  const [ops, setOps] = useState<PaymentOps | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setOps(await apiGet<PaymentOps>('/api/payments/ops'))
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar operações.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const fmt = (n: number | undefined) => (n === undefined ? '—' : String(n))
  const hasDead = ops ? ops.outboxDead > 0 || ops.webhookDeliveriesDead > 0 : false

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Pagamentos"
        description="Saúde das filas: eventos (outbox), entregas de webhook e reconciliação."
        action={
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Spinner /> : <RefreshCw className="size-4" />} Atualizar
          </Button>
        }
      />
      <PaymentsTabs />

      {hasDead ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          Há itens em dead-letter (esgotaram as tentativas) — requer investigação.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OverviewCard
          title="Outbox pendente"
          value={fmt(ops?.outboxPending)}
          description="Eventos de domínio a publicar"
        />
        <OverviewCard
          title="Outbox dead-letter"
          value={fmt(ops?.outboxDead)}
          icon={ops && ops.outboxDead > 0 ? AlertTriangle : undefined}
          description="Eventos que esgotaram as tentativas"
        />
        <OverviewCard
          title="Aguardando cobrança"
          value={fmt(ops?.paymentsAwaitingCharge)}
          description="Pagamentos sem cobrança criada (modo assíncrono)"
        />
        <OverviewCard
          title="Webhooks pendentes"
          value={fmt(ops?.webhookDeliveriesPending)}
          description="Entregas de saída na fila"
        />
        <OverviewCard
          title="Webhooks dead-letter"
          value={fmt(ops?.webhookDeliveriesDead)}
          icon={ops && ops.webhookDeliveriesDead > 0 ? AlertTriangle : undefined}
          description="Entregas que esgotaram as tentativas"
        />
        <OverviewCard
          title="Reconciliação"
          value={fmt(ops?.reconcilePending)}
          description="PENDING com cobrança aguardando confirmação"
        />
      </div>
    </div>
  )
}
