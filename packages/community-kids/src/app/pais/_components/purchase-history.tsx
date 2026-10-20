'use client'

import {
  comebackSubscriptionId,
  isKidsComunidadeSubscription,
} from '@sistemazero/member-shell/lib/subscription-comeback'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Spinner } from '@sistemazero/ui/spinner'
import { ArrowUpRight, CreditCard, Receipt, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiGet, apiSend } from '@/lib/api'
import { formatCentsStr } from '@/lib/format'
import { comunidadeContinuarUrl } from '@/lib/links'
import {
  type MySubscriptionView,
  nextChargeDate,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type Paginated,
  type PaymentView,
  SUBSCRIPTION_STATUS_LABELS,
} from '@/lib/types'
import { SECONDARY_ACTION, StatusChip } from './parent-ui'

/** Só o dia ("1 de nov. de 2026"): a hora de uma cobrança prevista não ajuda ninguém. */
function formatDay(value: Date | string): string {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

/**
 * O período já pago de uma assinatura cancelada ainda não terminou: a última cobrança (ou a
 * criação) mais um intervalo. A data é derivada, como a da próxima cobrança (`nextChargeDate`).
 */
function paidPeriodRunning(subscription: MySubscriptionView, now: Date): boolean {
  if (subscription.status !== 'CANCELED') return false
  const end = new Date(subscription.lastChargeAt ?? subscription.createdAt)
  if (Number.isNaN(end.getTime())) return false
  end.setMonth(end.getMonth() + subscription.intervalMonths)
  return end > now
}

const DIALOG_ACTIONS =
  'flex flex-wrap justify-end gap-2 [&_button]:min-h-11 [&_button]:rounded-full [&_button]:px-4'

/** O histórico das compras feitas com o e-mail da conta, em páginas de 20. */
export function PurchaseHistory() {
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
    <section aria-labelledby="parents-purchases" className="kids-carta flex flex-col gap-3 p-6">
      <h3 id="parents-purchases" className="sz-display text-xl">
        Histórico de compras
      </h3>
      {items === null ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-14 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhuma compra ainda. As compras feitas com o e-mail desta conta aparecem aqui.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-(--linha-carta)">
          {items.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--band-ceu) text-primary">
                <Receipt className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">
                  {payment.description ?? 'Compra'}
                </strong>
                <span className="text-muted-foreground text-xs">
                  {formatDay(payment.paidAt ?? payment.createdAt)} ·{' '}
                  {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                </span>
              </span>
              <span className="text-right">
                <strong className="sz-display block">
                  {formatCentsStr(payment.amountInCents)}
                </strong>
                <span
                  className={`font-bold text-xs ${payment.status === 'PAID' ? 'text-(--success-foreground)' : payment.status === 'FAILED' || payment.status === 'EXPIRED' ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {items && items.length < total ? (
        <Button
          variant="secondary"
          className="min-h-11 self-center rounded-full px-6"
          onClick={() => void load(items.length)}
          disabled={loading}
        >
          {loading ? <Spinner className="size-4" /> : 'Carregar mais'}
        </Button>
      ) : null}
    </section>
  )
}

/** As assinaturas da conta, cada uma num cartão, com o cancelamento confirmado. */
export function ParentSubscriptions() {
  const [subs, setSubs] = useState<MySubscriptionView[]>([])
  const [confirming, setConfirming] = useState<MySubscriptionView | null>(null)
  const [canceling, setCanceling] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ items: MySubscriptionView[] }>('/api/payments/my/subscriptions')
      setSubs(data.items)
    } catch {
      // Sem assinaturas em falha: o histórico de compras segue útil.
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
  // Só a Comunidade Kids Encerrada mais recente leva à continuidade, e nenhuma com outra ativa
  // (régua do member-shell). A Cancelada ainda tem acesso: o botão ali faria pagar duas vezes.
  const comebackId = comebackSubscriptionId(subs, isKidsComunidadeSubscription)
  const now = new Date()

  return (
    <>
      {subs.map((subscription) => {
        const next = nextChargeDate(subscription)
        const suffix =
          subscription.intervalMonths === 12
            ? '/ano'
            : subscription.intervalMonths === 1
              ? '/mês'
              : ''
        const active = subscription.status === 'ACTIVE'
        return (
          <section
            key={subscription.id}
            aria-label="Assinatura"
            className="kids-carta flex flex-col gap-4 p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="sz-display text-xl">Assinatura</h3>
              <StatusChip tone={active ? 'ok' : 'neutral'} icon={ShieldCheck}>
                {SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? subscription.status}
              </StatusChip>
            </div>
            <p className="font-extrabold text-lg">{subscription.description ?? 'Assinatura'}</p>
            <p className="sz-display text-[2rem] leading-none">
              {formatCentsStr(subscription.amountInCents)}
              <span className="font-sans text-base text-muted-foreground">{suffix}</span>
            </p>
            <p className="flex items-start gap-2 text-muted-foreground text-sm">
              <CreditCard className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {subscription.card.brand.toUpperCase()} •••• {subscription.card.last4}
                {next ? ` · próxima cobrança por volta de ${formatDay(next)}` : null}
              </span>
            </p>
            {paidPeriodRunning(subscription, now) ? (
              <p className="text-muted-foreground text-sm">
                O acesso continua até o fim do período já pago.
              </p>
            ) : null}
            {active ? (
              <button
                type="button"
                className="min-h-11 self-start font-bold text-destructive text-sm underline-offset-4 hover:underline"
                onClick={() => setConfirming(subscription)}
              >
                Cancelar assinatura
              </button>
            ) : subscription.id === comebackId ? (
              <a
                href={comunidadeContinuarUrl('pais-assinatura')}
                target="_blank"
                rel="noopener noreferrer"
                className={`${SECONDARY_ACTION} self-start`}
              >
                Ver como continuar <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            ) : null}
          </section>
        )
      })}
      {confirming ? (
        <Dialog
          open
          onClose={() => (canceling ? null : setConfirming(null))}
          title="Cancelar assinatura?"
          description={confirming.description ?? undefined}
          footer={
            <div className={DIALOG_ACTIONS}>
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
            </div>
          }
        >
          <p className="text-muted-foreground text-sm">
            Você não será cobrado de novo, e o{' '}
            <strong>acesso continua até o fim do período já pago</strong>. Depois disso, a
            plataforma fica indisponível até uma nova assinatura.
          </p>
        </Dialog>
      ) : null}
    </>
  )
}

/** "Trocar senha" como cartão da Conta (o diálogo é o mesmo do menu da conta). */
export function PasswordCard({ onChange }: { onChange: () => void }) {
  return (
    <section
      aria-labelledby="parents-password"
      className="kids-carta flex flex-wrap items-center gap-4 p-6"
    >
      <span className="min-w-0 flex-1">
        <h2 id="parents-password" className="font-extrabold">
          Senha da conta
        </h2>
        <span className="text-muted-foreground text-sm">
          Trocar a senha encerra a sessão em todos os aparelhos.
        </span>
      </span>
      <button type="button" className={SECONDARY_ACTION} onClick={onChange}>
        Trocar senha
      </button>
    </section>
  )
}
