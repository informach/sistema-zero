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

/**
 * Saúde dos pagamentos: as filas do serviço de pagamentos em palavras simples. Os nomes
 * técnicos de cada cartão (outbox, webhook, dead-letter, reconciliação) ficam aqui no código:
 * outboxPending/outboxDead = eventos de domínio a publicar / que esgotaram as tentativas;
 * paymentsAwaitingCharge = pagamentos sem cobrança criada (modo assíncrono);
 * webhookDeliveries* = avisos que os pagamentos ENTREGAM aos outros serviços (webhooks de saída),
 *   na fila / que esgotaram as tentativas (não são avisos que chegam do banco);
 * reconcilePending = PENDING com cobrança aguardando a confirmação do provedor.
 */
export function OpsClient() {
  const [ops, setOps] = useState<PaymentOps | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setOps(await apiGet<PaymentOps>('/api/payments/ops'))
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Os números dos pagamentos não carregaram.')
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
        title="Vendas"
        description="Se os pagamentos estão chegando e os avisos saindo como deveriam."
        action={
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />} Atualizar
          </Button>
        }
      />
      <PaymentsTabs />

      {hasDead ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Alguns avisos não saíram depois de todas as tentativas. Vale olhar com a equipe técnica.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OverviewCard
          title="Avisos esperando para sair"
          value={fmt(ops?.outboxPending)}
          description="O sistema avisa os outros serviços de cada venda. Estes ainda vão sair."
        />
        <OverviewCard
          title="Avisos que não saíram"
          value={fmt(ops?.outboxDead)}
          icon={ops && ops.outboxDead > 0 ? AlertTriangle : undefined}
          description="Tentamos todas as vezes e não deu. O normal é zero."
        />
        <OverviewCard
          title="Cobranças aguardando o banco"
          value={fmt(ops?.paymentsAwaitingCharge)}
          description="Vendas em que o Pix, o boleto ou o cartão ainda não foi gerado."
        />
        <OverviewCard
          title="Avisos para os outros sistemas na fila"
          value={fmt(ops?.webhookDeliveriesPending)}
          description="Avisos dos pagamentos para os outros sistemas, esperando a vez de serem entregues."
        />
        <OverviewCard
          title="Avisos para os outros sistemas com problema"
          value={fmt(ops?.webhookDeliveriesDead)}
          icon={ops && ops.webhookDeliveriesDead > 0 ? AlertTriangle : undefined}
          description="Avisos dos pagamentos que os outros sistemas não receberam depois de todas as tentativas. O normal é zero."
        />
        <OverviewCard
          title="Em conferência"
          value={fmt(ops?.reconcilePending)}
          description="Cobranças criadas esperando o banco confirmar se foram pagas."
        />
      </div>
    </div>
  )
}
