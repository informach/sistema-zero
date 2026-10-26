'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Pagination } from '@sistemazero/ui/pagination'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import {
  Banknote,
  Copy,
  CreditCard,
  FilePlus2,
  RotateCcw,
  Search,
  ShieldCheck,
  Undo2,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { communityPage, useCommunityRequests } from '@/components/admin/community-page'
import { OverviewCard } from '@/components/admin/overview-card'
import { PaymentsTabs } from '@/components/admin/payments-tabs'
import { ReadOnlyNotice } from '@/components/admin/read-only-notice'
import { StatusBadge, statusLabel } from '@/components/admin/status-badge'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import type { ApiError } from '@/lib/api'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import { formatCentsStr, formatDate } from '@/lib/format'
import type { Platform } from '@/lib/platform'
import {
  type InvoiceList,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type Paginated,
  type PaymentRow,
  type PaymentStats,
} from '@/lib/types'
import { copyToClipboard } from '../../notas-fiscais/copy-to-clipboard'
import { InvoiceStatusBadge } from '../../notas-fiscais/invoice-status-badge'
import {
  INVOICE_LOOKUP_LOADING,
  type InvoiceLookup,
  type InvoiceLookupEntry,
  invoiceFooterAction,
  invoiceLookupFor,
  invoiceLookupFrom,
} from './invoice-lookup'

const LIMIT = 20

/** Lê e limpa `?busca=` (o detalhe da nota fiscal abre Vendas já filtrado pela venda). */
function takeSearchParam(name: string): string {
  const url = new URL(window.location.href)
  const value = url.searchParams.get(name)
  if (value === null) return ''
  url.searchParams.delete(name)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  return value.trim()
}

function methodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method
}

/** Estorno disponível só para Pix/cartão pagos (boleto não tem estorno programático). */
function canRefund(p: PaymentRow): boolean {
  return p.status === 'PAID' && (p.method === 'PIX' || p.method === 'CREDIT_CARD')
}

/** "DD/MM" curto p/ o fim da garantia (formatDate completo fica longo na linha). */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** Badge do estado da garantia (apoia a decisão de estorno). */
function GuaranteeBadge({ payment: p }: { payment: PaymentRow }) {
  if (!p.guarantee) {
    return p.paidAt ? <Badge variant="muted">Sem garantia na oferta</Badge> : <span>—</span>
  }
  if (p.guarantee.expired) {
    return <Badge variant="muted">Garantia acabou em {shortDate(p.guarantee.until)}</Badge>
  }
  return (
    <Badge variant="success">
      <ShieldCheck className="size-3" aria-hidden />
      Em garantia até {shortDate(p.guarantee.until)}, faltam {p.guarantee.daysLeft}{' '}
      {p.guarantee.daysLeft === 1 ? 'dia' : 'dias'}
    </Badge>
  )
}

export const TransactionsClient = communityPage<{ currentRole: string }>(TransactionsCommunity)

function TransactionsCommunity({
  currentRole,
  audience,
}: {
  currentRole: string
  audience: Platform
}) {
  const [unassigned, setUnassigned] = useState(false)
  const scope = unassigned ? 'unassigned' : audience
  return (
    <div className="space-y-4">
      <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={unassigned}
          onChange={(event) => setUnassigned(event.target.checked)}
          className="mt-1"
        />
        <span>
          Consultar registros sem comunidade identificada. Eles ficam fora dos totais de Kids e
          Adultos até a conferência da origem da compra.
        </span>
      </label>
      <TransactionsContent key={scope} currentRole={currentRole} audience={scope} />
    </div>
  )
}

function TransactionsContent({
  currentRole,
  audience,
}: {
  currentRole: string
  audience: Platform | 'unassigned'
}) {
  const { get: apiGet, send: apiSend } = useCommunityRequests(audience)
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'
  const [items, setItems] = useState<PaymentRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [selected, setSelected] = useState<PaymentRow | null>(null)
  const [confirmingRefund, setConfirmingRefund] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [invoiceEntry, setInvoiceEntry] = useState<InvoiceLookupEntry>({
    paymentId: null,
    lookup: INVOICE_LOOKUP_LOADING,
  })

  // Chegando do detalhe de uma nota: `?busca=<código da venda>` já filtra a lista.
  useEffect(() => {
    const busca = takeSearchParam('busca')
    if (busca) setQ(busca)
  }, [])

  // A nota fiscal da venda aberta (best-effort: a busca livre das notas casa o código da venda).
  // O resultado guarda a venda a que se refere: trocar de venda volta a "procurando" já no
  // primeiro render, sem mostrar o selo ou o link da venda anterior.
  const selectedId = selected?.id ?? null
  const invoice = invoiceLookupFor(invoiceEntry, selectedId)
  const invoiceAction = invoiceFooterAction(invoice)
  useEffect(() => {
    if (!selectedId) return
    let alive = true
    setInvoiceEntry({ paymentId: selectedId, lookup: INVOICE_LOOKUP_LOADING })
    apiGet<InvoiceList>(`/api/nfse/invoices?limit=10&q=${encodeURIComponent(selectedId)}`)
      .then((page) => {
        if (!alive) return
        setInvoiceEntry({
          paymentId: selectedId,
          lookup: invoiceLookupFrom(page.items, selectedId),
        })
      })
      .catch(() => {
        if (alive) setInvoiceEntry({ paymentId: selectedId, lookup: { state: 'error' } })
      })
    return () => {
      alive = false
    }
  }, [apiGet, selectedId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (q.trim()) params.set('q', q.trim())
      if (status) params.set('status', status)
      if (method) params.set('method', method)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const page = await apiGet<Paginated<PaymentRow>>(`/api/payments/transactions?${params}`)
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      toast.error((err as ApiError).message ?? 'As vendas não carregaram. Tente de novo.')
    } finally {
      setLoading(false)
    }
  }, [apiGet, offset, q, status, method, from, to])

  const loadStats = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      setStats(await apiGet<PaymentStats>(`/api/payments/stats?${params}`))
    } catch {
      setStats(null)
    }
  }, [apiGet, from, to])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  function openDetail(p: PaymentRow) {
    setSelected(p)
    setConfirmingRefund(false)
  }

  async function doRefund() {
    if (!selected) return
    setRefunding(true)
    try {
      const updated = await apiSend<PaymentRow>(
        `/api/payments/transactions/${selected.id}/refund`,
        'POST',
      )
      toast.success('Pedimos o estorno. O valor volta pela mesma forma de pagamento.')
      // A rota de refund devolve a view crua (sem `guarantee`) — preserva a resolvida.
      setSelected({ ...updated, guarantee: updated.guarantee ?? selected.guarantee })
      setConfirmingRefund(false)
      await Promise.all([load(), loadStats()])
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      toast.error((err as ApiError).message ?? 'O estorno não saiu. Tente de novo.')
    } finally {
      setRefunding(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Vendas"
        community={audience === 'unassigned' ? 'Comunidade ainda não identificada' : true}
        description={
          canWrite
            ? 'Pix, boleto e cartão. Clique numa venda para ver os detalhes, estornar ou abrir a nota.'
            : 'Pix, boleto e cartão. Clique numa venda para ver os detalhes ou abrir a nota.'
        }
      />
      <PaymentsTabs />
      {canWrite ? null : <ReadOnlyNotice />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          title="Recebido"
          value={stats ? formatCentsStr(stats.paidAmountInCents) : '—'}
          icon={Banknote}
          description="Soma das vendas pagas"
        />
        <OverviewCard
          title="Vendas pagas"
          value={stats ? String(stats.paidCount) : '—'}
          icon={CreditCard}
          description="Pagamentos confirmados"
        />
        <OverviewCard
          title="Cobranças"
          value={stats ? String(stats.totalCount) : '—'}
          description="Todas as cobranças do período"
        />
        <OverviewCard
          title="Estornado"
          value={stats ? formatCentsStr(stats.refundedAmountInCents) : '—'}
          icon={Undo2}
          description="Soma do que voltou para quem comprou"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
        <div className="relative flex-1 lg:min-w-[16rem]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="E-mail ou código da venda"
            aria-label="Buscar vendas"
            value={q}
            onChange={(e) => {
              setOffset(0)
              setQ(e.target.value)
            }}
            className="pl-8"
          />
        </div>
        <Select
          aria-label="Situação"
          value={status}
          onChange={(e) => {
            setOffset(0)
            setStatus(e.target.value)
          }}
          className="lg:w-40"
        >
          <option value="">Todas as situações</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Forma de pagamento"
          value={method}
          onChange={(e) => {
            setOffset(0)
            setMethod(e.target.value)
          }}
          className="lg:w-36"
        >
          <option value="">Todas as formas</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {methodLabel(m)}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          aria-label="Desde o dia"
          value={from}
          onChange={(e) => {
            setOffset(0)
            setFrom(e.target.value)
          }}
          className="lg:w-40"
        />
        <Input
          type="date"
          aria-label="Até o dia"
          value={to}
          onChange={(e) => {
            setOffset(0)
            setTo(e.target.value)
          }}
          className="lg:w-40"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quem comprou</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Quando</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={5} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhuma venda com esses filtros.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id} onClick={() => openDetail(p)} className="cursor-pointer">
                  <TableCell>
                    <div className="font-medium">{p.customer?.name ?? '—'}</div>
                    {p.customer?.email ? (
                      <div className="text-xs text-muted-foreground">{p.customer.email}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{methodLabel(p.method)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCentsStr(p.amountInCents, p.currency)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusBadge status={p.status} />
                      {p.guarantee && !p.guarantee.expired ? (
                        <ShieldCheck
                          className="size-3.5 text-success-foreground"
                          aria-label={`Em garantia até ${shortDate(p.guarantee.until)}`}
                        />
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(p.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} />

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Venda"
        description={
          selected
            ? `${selected.customer?.name ?? 'Quem comprou não informado'}, ${formatDate(selected.createdAt)}`
            : undefined
        }
        footer={
          selected &&
          canWrite &&
          selected.status === 'PAID' &&
          (invoiceAction !== null || canRefund(selected)) ? (
            <div className="flex w-full flex-col gap-2">
              {canWrite && canRefund(selected) && confirmingRefund ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <p className="font-semibold text-destructive">
                    Estornar {formatCentsStr(selected.amountInCents, selected.currency)} para{' '}
                    {selected.customer?.name ?? 'quem comprou'}?
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    O valor volta pela mesma forma de pagamento. Não dá para desfazer.
                  </p>
                  {selected.guarantee?.expired ? (
                    <p className="mt-1 text-destructive">
                      Atenção: a garantia desta compra acabou em{' '}
                      {formatDate(selected.guarantee.until)}.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                {canWrite && selected.status === 'PAID' && invoiceAction === 'emit' ? (
                  <Link
                    href={`/admin/notas-fiscais?emitir=${encodeURIComponent(selected.id)}`}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    <FilePlus2 className="size-4" aria-hidden /> Emitir nota desta venda
                  </Link>
                ) : null}
                {canWrite && selected.status === 'PAID' && invoiceAction === 'error' ? (
                  <p role="status" className="mr-auto self-center text-sm text-muted-foreground">
                    Não conseguimos conferir a nota desta venda.
                  </p>
                ) : null}
                {canWrite && canRefund(selected) ? (
                  confirmingRefund ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setConfirmingRefund(false)}
                        disabled={refunding}
                      >
                        Não estornar
                      </Button>
                      <Button variant="destructive" onClick={doRefund} disabled={refunding}>
                        {refunding ? <Spinner /> : <RotateCcw className="size-4" aria-hidden />}
                        Sim, estornar
                      </Button>
                    </>
                  ) : (
                    <Button variant="destructive" onClick={() => setConfirmingRefund(true)}>
                      <Undo2 className="size-4" aria-hidden /> Estornar
                    </Button>
                  )
                ) : null}
              </div>
            </div>
          ) : null
        }
      >
        {selected ? <PaymentDetail payment={selected} invoice={invoice} /> : null}
      </Dialog>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

/** Código técnico com botão de copiar (fica nos detalhes técnicos da venda). */
function CopyCode({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => copyToClipboard(value, label)}
      className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left font-mono text-xs transition-colors hover:bg-muted"
      title={`Copiar ${label.toLowerCase()}`}
      aria-label={`Copiar ${label.toLowerCase()}`}
    >
      <span className="break-all">{value}</span>
      <Copy className="size-3 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )
}

/** A nota fiscal da venda, procurada pelo código da venda na lista de notas (best-effort). */
function InvoiceFact({ lookup }: { lookup: InvoiceLookup }) {
  if (lookup.state === 'loading') return <span className="text-muted-foreground">Procurando…</span>
  if (lookup.state === 'error')
    return (
      <span className="text-muted-foreground">
        Não conseguimos carregar a nota. Feche e abra a venda de novo.
      </span>
    )
  if (lookup.state === 'none' && lookup.previous)
    return (
      <span className="inline-flex flex-wrap items-center justify-end gap-2">
        <span className="text-muted-foreground">Sem nota valendo. A anterior:</span>
        <InvoiceStatusBadge status={lookup.previous.status} />
        <Link
          href={`/admin/notas-fiscais?nota=${encodeURIComponent(lookup.previous.id)}`}
          className="text-xs text-primary hover:underline"
        >
          Abrir a nota anterior
        </Link>
      </span>
    )
  if (lookup.state === 'none') return <span className="text-muted-foreground">Ainda sem nota</span>
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      <InvoiceStatusBadge status={lookup.invoice.status} />
      <Link
        href={`/admin/notas-fiscais?nota=${encodeURIComponent(lookup.invoice.id)}`}
        className="text-xs text-primary hover:underline"
      >
        Abrir a nota
      </Link>
    </span>
  )
}

function PaymentDetail({ payment: p, invoice }: { payment: PaymentRow; invoice: InvoiceLookup }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      {p.failureReason ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive"
        >
          <span className="font-semibold">O pagamento não deu certo.</span> Motivo:{' '}
          {p.failureReason}
        </p>
      ) : null}
      <div className="rounded-lg border border-border p-3">
        <Row label="Valor" value={formatCentsStr(p.amountInCents, p.currency)} />
        <Row label="Situação" value={<StatusBadge status={p.status} />} />
        <Row
          label="Forma"
          value={
            p.card
              ? `${methodLabel(p.method)} ${p.card.brand} final ${p.card.last4}, ${p.card.installments}x`
              : methodLabel(p.method)
          }
        />
        <Row label="Pago em" value={formatDate(p.paidAt)} />
        {p.paidAt ? <Row label="Garantia" value={<GuaranteeBadge payment={p} />} /> : null}
        {p.status === 'PAID' || p.status === 'REFUNDED' ? (
          <Row label="Nota fiscal" value={<InvoiceFact lookup={invoice} />} />
        ) : null}
        {p.refundedAt ? <Row label="Estornado em" value={formatDate(p.refundedAt)} /> : null}
      </div>
      <div className="rounded-lg border border-border p-3">
        <Row label="Quem comprou" value={p.customer?.name ?? '—'} />
        <Row label="E-mail" value={p.customer?.email ?? '—'} />
        <Row label="CPF ou CNPJ" value={p.customer?.document ?? '—'} />
        {p.customer?.phone ? <Row label="Telefone" value={p.customer.phone} /> : null}
      </div>
      <div className="rounded-lg border border-border p-3">
        <Row label="Criada em" value={formatDate(p.createdAt)} />
        <Row label="Vence em" value={formatDate(p.expiresAt)} />
        {p.subscriptionId ? <Row label="Origem" value="Assinatura no cartão" /> : null}
      </div>
      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
        <div className="mt-2">
          <Row label="Código da venda" value={<CopyCode value={p.id} label="Código da venda" />} />
          {p.txid ? (
            <Row label="txid do Pix" value={<CopyCode value={p.txid} label="txid" />} />
          ) : null}
          {p.providerPaymentId ? (
            <Row
              label="Código no provedor"
              value={<CopyCode value={p.providerPaymentId} label="Código no provedor" />}
            />
          ) : null}
          {p.providerRefundId ? (
            <Row
              label="Código do estorno"
              value={<CopyCode value={p.providerRefundId} label="Código do estorno" />}
            />
          ) : null}
          <Row
            label="Código de quem comprou"
            value={<CopyCode value={p.consumerId} label="Código de quem comprou" />}
          />
          {p.subscriptionId ? (
            <Row
              label="Código da assinatura"
              value={<CopyCode value={p.subscriptionId} label="Código da assinatura" />}
            />
          ) : null}
          <Row label="Provedor" value={p.provider} />
          <Row label="Atualizada em" value={formatDate(p.updatedAt)} />
        </div>
      </details>
    </div>
  )
}
