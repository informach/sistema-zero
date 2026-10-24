'use client'

import { SubscriptionCardUpdate } from '@sistemazero/member-shell/components/billing/subscription-card-update'

import { comunidadeAdultoContinuarUrl } from '@sistemazero/member-shell/lib/adult-links'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Check, Receipt } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiGet, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import { comebackSubscriptionId } from '@/lib/continuity'
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

const LIMIT = 20

const dayPt = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})

/** ISO → `dd/mm/aaaa` no horário de Brasília (ou "Sem data"). */
function formatDay(iso: string | null | undefined): string {
  if (!iso) return 'Sem data'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? 'Sem data' : dayPt.format(date)
}

/** "R$ 49,90 por mês", "R$ 478,80 por ano" ou "a cada N meses". */
function subscriptionPriceLabel(sub: MySubscriptionView): string {
  const price = formatCentsStr(sub.amountInCents)
  if (sub.intervalMonths === 1) return `${price} por mês`
  if (sub.intervalMonths === 12) return `${price} por ano`
  return `${price} a cada ${sub.intervalMonths} meses`
}

/** O selo do status, sempre com a palavra (nunca só a cor). */
const PAYMENT_CHIP: Record<string, string> = {
  PAID: 'sz-chip-ok',
  PENDING: 'sz-chip-aviso',
  FAILED: 'sz-chip-aviso',
  REFUNDED: 'sz-chip-acao',
}

function PaymentStatusChip({ status }: { status: string }) {
  return (
    <span className={cn('sz-chip justify-self-start', PAYMENT_CHIP[status])}>
      {PAYMENT_STATUS_LABELS[status] ?? status}
    </span>
  )
}

function SubscriptionStatusChip({ status }: { status: string }) {
  const label = SUBSCRIPTION_STATUS_LABELS[status] ?? status
  if (status === 'ACTIVE')
    return (
      <span className="sz-chip sz-chip-ok">
        <Check aria-hidden />
        {label}
      </span>
    )
  return <span className={cn('sz-chip', status === 'PENDING' && 'sz-chip-aviso')}>{label}</span>
}

/** "Minha assinatura": só aparece quando o comprador tem alguma. */
export function SubscriptionsSection() {
  const [subs, setSubs] = useState<MySubscriptionView[]>([])
  const [confirming, setConfirming] = useState<MySubscriptionView | null>(null)
  const [canceling, setCanceling] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ items: MySubscriptionView[] }>('/api/payments/my/subscriptions')
      setSubs(data.items)
    } catch {
      // Sem assinaturas visíveis em falha — a lista de compras segue útil.
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function cancel(sub: MySubscriptionView) {
    setCanceling(true)
    try {
      await apiSend(`/api/payments/my/subscriptions/${sub.id}`, 'DELETE')
      toast.success('Assinatura cancelada. Seu acesso continua até o fim do período já pago.')
      setConfirming(null)
      await load()
    } catch (error) {
      const pending =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'SUBSCRIPTION_CANCELLATION_PENDING'
      toast.error(
        pending
          ? 'Pedido de cancelamento recebido. Estamos aguardando a confirmação da operadora.'
          : 'Não foi possível confirmar o cancelamento. Confira a situação da assinatura.',
      )
      setConfirming(null)
      await load()
    } finally {
      setCanceling(false)
    }
  }

  if (subs.length === 0) return null
  const comebackId = comebackSubscriptionId(subs)

  return (
    <section
      aria-labelledby="compras-assinatura"
      className="sz-card flex flex-col gap-4 p-6 md:p-8"
    >
      <h2 id="compras-assinatura" className="sz-h3">
        {subs.length === 1 ? 'Minha assinatura' : 'Minhas assinaturas'}
      </h2>
      <ul className="flex flex-col gap-3">
        {subs.map((sub) => {
          const next = nextChargeDate(sub)
          return (
            <li
              key={sub.id}
              className="sz-soft flex flex-wrap items-center gap-x-6 gap-y-3 p-5 md:p-6"
            >
              <div className="flex min-w-0 flex-1 basis-[18rem] flex-col gap-1.5">
                <strong className="text-[1.1rem]">{sub.description ?? 'Assinatura'}</strong>
                <p className="text-muted-foreground">
                  <b className="text-foreground">{subscriptionPriceLabel(sub)}</b>
                  {' · '}
                  {sub.card.brand.toUpperCase()} •••• {sub.card.last4}
                  {next ? ` · próxima cobrança por volta de ${dayPt.format(next)}` : null}
                  {sub.status === 'CANCELED' && sub.canceledAt
                    ? ` · cancelada em ${formatDay(sub.canceledAt)}`
                    : null}
                </p>
              </div>
              <SubscriptionStatusChip status={sub.status} />
              {sub.cancelRequestedAt && sub.status === 'ACTIVE' ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Cancelamento solicitado. Aguardando confirmação da operadora; seu período já pago
                  continua preservado.
                </p>
              ) : null}
              {sub.status === 'ACTIVE' && !sub.cancelRequestedAt ? (
                <SubscriptionCardUpdate subscriptionId={sub.id} onUpdated={() => void load()} />
              ) : null}
              {sub.status === 'ACTIVE' && !sub.cancelRequestedAt ? (
                <button
                  type="button"
                  className="sz-btn-outline sz-btn-sm"
                  onClick={() => setConfirming(sub)}
                >
                  Cancelar assinatura
                </button>
              ) : null}
              {sub.id === comebackId ? (
                // A oferta de continuidade é página EXTERNA (funil): outra aba.
                <a
                  href={comunidadeAdultoContinuarUrl('compras-assinatura')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sz-btn sz-btn-sm"
                >
                  Voltar para a Comunidade
                </a>
              ) : null}
            </li>
          )
        })}
      </ul>
      <p className="text-[0.9rem] text-muted-foreground">
        Se cancelar, o acesso continua até o fim do período já pago.
      </p>

      {confirming ? (
        <Dialog
          open
          onClose={() => (canceling ? null : setConfirming(null))}
          title="Cancelar assinatura?"
          description={confirming.description ?? undefined}
          footer={
            // O rodapé do Dialog não quebra linha: no celular os dois botões descem um embaixo do outro.
            <div className="flex w-full flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirming(null)}
                disabled={canceling}
                className="max-sm:w-full"
              >
                Manter assinatura
              </Button>
              <Button
                variant="destructive"
                onClick={() => void cancel(confirming)}
                disabled={canceling}
                className="max-sm:w-full"
              >
                {canceling ? 'Cancelando…' : 'Cancelar assinatura'}
              </Button>
            </div>
          }
        >
          <p className="text-muted-foreground">
            Você não será cobrado de novo, e o seu{' '}
            <strong className="text-foreground">
              acesso continua até o fim do período já pago
            </strong>
            . Depois disso, a plataforma fica indisponível até uma nova assinatura.
          </p>
        </Dialog>
      ) : null}
    </section>
  )
}

const COLUMNS = 'md:grid-cols-[2fr_1fr_1.2fr_1fr_1fr]'

/** "Histórico de compras": a lista paginada; cada linha abre o detalhe. */
export function PurchasesClient() {
  const [page, setPage] = useState<Paginated<PaymentView> | null>(null)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<PaymentView | null>(null)

  const load = useCallback(async (newOffset: number) => {
    setLoading(true)
    try {
      const data = await apiGet<Paginated<PaymentView>>(
        `/api/payments/my?limit=${LIMIT}&offset=${newOffset}`,
      )
      setPage(data)
      setOffset(newOffset)
      setFailed(false)
    } catch {
      setFailed(true)
      toast.error('Não foi possível carregar suas compras.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(0)
  }, [load])

  const items = page?.items ?? []
  const total = page?.total ?? 0

  return (
    <section aria-labelledby="compras-historico" className="sz-card flex flex-col gap-4 p-6 md:p-8">
      <h2 id="compras-historico" className="sz-h3">
        Histórico de compras
      </h2>
      {loading && !page ? (
        <PurchasesSkeleton />
      ) : failed && !page ? (
        <div className="flex flex-col items-start gap-3">
          <p role="status" className="text-muted-foreground">
            Não foi possível carregar suas compras agora.
          </p>
          <button type="button" className="sz-btn-outline sz-btn-sm" onClick={() => void load(0)}>
            Tentar novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="sz-soft flex flex-col items-center gap-3 px-6 py-12 text-center">
          <Receipt className="size-10 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-bold">Nenhuma compra encontrada</p>
            <p className="mt-1 text-muted-foreground">
              As compras feitas com o e-mail desta conta aparecem aqui.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div aria-busy={loading || undefined}>
            <div
              aria-hidden
              className={cn(
                'hidden gap-4 border-border border-b px-4 py-3 font-bold text-[0.9rem] text-muted-foreground md:grid',
                COLUMNS,
              )}
            >
              <span>Descrição</span>
              <span>Valor</span>
              <span>Método</span>
              <span>Data</span>
              <span>Status</span>
            </div>
            <ul>
              {items.map((payment, index) => (
                <li key={payment.id} className={cn(index > 0 && 'border-border border-t')}>
                  <button
                    type="button"
                    onClick={() => setSelected(payment)}
                    className={cn(
                      'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-[0.6rem] px-4 py-4 text-left transition-colors hover:bg-background md:min-h-[3.4rem] md:py-2',
                      COLUMNS,
                    )}
                  >
                    <strong className="min-w-0 break-words">
                      {payment.description ?? 'Compra'}
                    </strong>
                    <span className="md:order-last">
                      <PaymentStatusChip status={payment.status} />
                    </span>
                    <span className="col-span-2 flex flex-wrap gap-x-2 text-[0.9rem] text-muted-foreground md:contents md:text-base md:text-foreground">
                      <span>{formatCentsStr(payment.amountInCents)}</span>
                      <span aria-hidden className="md:hidden">
                        ·
                      </span>
                      <span>{PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}</span>
                      <span aria-hidden className="md:hidden">
                        ·
                      </span>
                      <span>{formatDay(payment.paidAt ?? payment.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {total > LIMIT ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-border border-t pt-4">
              <span className="text-[0.9rem] text-muted-foreground">
                {offset + 1} a {Math.min(offset + LIMIT, total)} de {total}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="sz-btn-quiet sz-btn-sm"
                  disabled={loading || offset === 0}
                  onClick={() => void load(Math.max(0, offset - LIMIT))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="sz-btn-outline sz-btn-sm"
                  disabled={loading || offset + LIMIT >= total}
                  onClick={() => void load(offset + LIMIT)}
                >
                  Próxima
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
      <PurchaseDetail payment={selected} onClose={() => setSelected(null)} />
    </section>
  )
}

function PurchaseDetail({
  payment,
  onClose,
}: {
  payment: PaymentView | null
  onClose: () => void
}) {
  if (!payment) return null
  return (
    <Dialog open onClose={onClose} title="Detalhes da compra" className="max-w-[38rem]">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-y-3">
        <DetailRow label="Descrição" value={<strong>{payment.description ?? 'Compra'}</strong>} />
        <DetailRow label="Valor" value={formatCentsStr(payment.amountInCents)} />
        <DetailRow label="Método" value={PAYMENT_METHOD_LABELS[payment.method] ?? payment.method} />
        <DetailRow label="Data" value={formatDate(payment.paidAt ?? payment.createdAt)} />
        <DetailRow label="Status" value={<PaymentStatusChip status={payment.status} />} />
        {payment.card ? (
          <DetailRow
            label="Cartão"
            value={`${payment.card.brand.toUpperCase()} •••• ${payment.card.last4} (${payment.card.installments}x)`}
          />
        ) : null}
        <DetailRow
          label="Identificador"
          value={<span className="break-all font-mono text-[0.9rem]">{payment.id}</span>}
        />
      </dl>
      {payment.boleto ? (
        <div className="sz-soft mt-5 flex flex-col gap-1.5 p-4">
          <p className="font-bold">Boleto</p>
          <p className="break-all font-mono text-[0.9rem]">{payment.boleto.digitableLine}</p>
          <a
            href={payment.boleto.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sz-link self-start"
          >
            Abrir PDF do boleto
          </a>
        </div>
      ) : null}
    </Dialog>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground max-sm:mt-2">{label}</dt>
      <dd className="min-w-0">{value}</dd>
    </>
  )
}

// Chaves estáveis das linhas-fantasma da lista.
const ROW_KEYS = ['r1', 'r2', 'r3', 'r4']

function PurchasesSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Carregando…</span>
      {ROW_KEYS.map((k) => (
        <div key={k} className={cn('grid grid-cols-2 items-center gap-4 px-4', COLUMNS)}>
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="hidden h-5 w-28 md:block" />
          <Skeleton className="hidden h-5 w-24 md:block" />
          <Skeleton className="hidden h-6 w-16 rounded-full md:block" />
        </div>
      ))}
    </div>
  )
}
