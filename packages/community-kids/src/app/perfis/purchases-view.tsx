'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Spinner } from '@sistemazero/ui/spinner'
import { Receipt } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { KidsBackButton } from '@/components/kids/back-button'
import { KidsEmptyState } from '@/components/kids/kids-empty-state'
import { KidsScreen } from '@/components/kids/kids-screen'
import { apiGet, apiSend } from '@/lib/api'
import { formatCentsStr, formatDate } from '@/lib/format'
import {
  type MySubscriptionView,
  nextChargeDate,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type Paginated,
  type PaymentView,
  SUBSCRIPTION_STATUS_LABELS,
} from '@/lib/types'

/** Histórico financeiro da conta, acessível apenas atrás do portão dos pais. */
export function PurchasesView({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<PaymentView[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (offset: number) => {
    setLoading(true)
    try {
      const page = await apiGet<Paginated<PaymentView>>(
        `/api/payments/my?limit=20&offset=${offset}`,
      )
      setItems((previous) => (offset === 0 ? page.items : [...(previous ?? []), ...page.items]))
      setTotal(page.total)
    } catch {
      toast.error('Não foi possível carregar as compras.')
      setItems((previous) => previous ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(0)
  }, [load])

  return (
    <KidsScreen align="start" innerClassName="flex max-w-2xl flex-col gap-6">
      <div>
        <KidsBackButton onClick={onBack} label="Voltar à área dos pais" showLabel />
      </div>
      <div>
        <h1 className="sz-display text-[clamp(2rem,3.4vw,2.8125rem)]">Minhas compras</h1>
        <p className="mt-2.5 font-medium text-[1.0625rem] text-muted-foreground">
          Histórico das compras feitas com o e-mail desta conta.
        </p>
      </div>

      <ParentSubscriptions />

      {items === null ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-20 rounded-(--raio-carta)" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <KidsEmptyState
          icon={Receipt}
          title="Nenhuma compra ainda"
          description="As compras feitas com o e-mail desta conta aparecem aqui."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((payment) => (
            <PurchaseCard key={payment.id} payment={payment} />
          ))}
        </ul>
      )}

      {items && items.length < total ? (
        <Button
          variant="secondary"
          className="self-center rounded-full px-6"
          onClick={() => void load(items.length)}
          disabled={loading}
        >
          {loading ? <Spinner className="size-4" /> : 'Carregar mais'}
        </Button>
      ) : null}
    </KidsScreen>
  )
}

function ParentSubscriptions() {
  const [subs, setSubs] = useState<MySubscriptionView[]>([])
  const [confirming, setConfirming] = useState<MySubscriptionView | null>(null)
  const [canceling, setCanceling] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ items: MySubscriptionView[] }>('/api/payments/my/subscriptions')
      setSubs(data.items)
    } catch {
      // Sem assinaturas em falha — o histórico de compras segue útil.
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function cancel(subscription: MySubscriptionView) {
    setCanceling(true)
    try {
      await apiSend(`/api/payments/my/subscriptions/${subscription.id}`, 'DELETE')
      toast.success('Assinatura cancelada. O acesso continua até o fim do período já pago.')
      setConfirming(null)
      await load()
    } catch {
      toast.error('Não foi possível cancelar. Tente novamente.')
    } finally {
      setCanceling(false)
    }
  }

  if (subs.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="sz-display text-xl">Assinaturas</h2>
      <ul className="flex flex-col gap-3">
        {subs.map((subscription) => {
          const next = nextChargeDate(subscription)
          const suffix =
            subscription.intervalMonths === 12
              ? '/ano'
              : subscription.intervalMonths === 1
                ? '/mês'
                : ''
          return (
            <li
              key={subscription.id}
              className="kids-carta flex flex-wrap items-center justify-between gap-3 p-5"
            >
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  {subscription.description ?? 'Assinatura'}
                </p>
                <p className="mt-0.5 text-muted-foreground text-sm">
                  <span className="sz-display">
                    {formatCentsStr(subscription.amountInCents)}
                    {suffix}
                  </span>
                  {' · '}
                  {subscription.card.brand.toUpperCase()} •••• {subscription.card.last4}
                  {next ? ` · próxima cobrança ~${formatDate(next.toISOString())}` : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold text-sm ${subscription.status === 'ACTIVE' ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? subscription.status}
                </span>
                {subscription.status === 'ACTIVE' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setConfirming(subscription)}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      {confirming ? (
        <Dialog
          open
          onClose={() => (canceling ? null : setConfirming(null))}
          title="Cancelar assinatura?"
          description={confirming.description ?? undefined}
          footer={
            <>
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={canceling}>
                Manter assinatura
              </Button>
              <Button
                variant="destructive"
                onClick={() => void cancel(confirming)}
                disabled={canceling}
              >
                {canceling ? 'Cancelando…' : 'Cancelar assinatura'}
              </Button>
            </>
          }
        >
          <p className="text-muted-foreground text-sm">
            Você não será cobrado de novo, e o{' '}
            <strong>acesso continua até o fim do período já pago</strong>. Depois disso, a
            plataforma fica indisponível até uma nova assinatura.
          </p>
        </Dialog>
      ) : null}
    </section>
  )
}

const STATUS_TONE: Record<string, string> = {
  PAID: 'text-primary',
  PENDING: 'text-[color:var(--sz-hot)]',
  FAILED: 'text-destructive',
  EXPIRED: 'text-destructive',
  CANCELED: 'text-muted-foreground',
  REFUNDED: 'text-muted-foreground',
}

function PurchaseCard({ payment }: { payment: PaymentView }) {
  return (
    <li className="kids-carta flex items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{payment.description ?? 'Compra'}</p>
        <p className="text-muted-foreground text-xs">
          {formatDate(payment.paidAt ?? payment.createdAt)} ·{' '}
          {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="sz-display text-foreground">{formatCentsStr(payment.amountInCents)}</p>
        <span
          className={`font-semibold text-xs ${STATUS_TONE[payment.status] ?? 'text-muted-foreground'}`}
        >
          {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
        </span>
      </div>
    </li>
  )
}
