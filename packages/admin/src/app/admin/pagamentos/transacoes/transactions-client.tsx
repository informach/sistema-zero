'use client'

import { Banknote, CreditCard, RotateCcw, Search, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { OverviewCard } from '@/components/admin/overview-card'
import { PaymentsTabs } from '@/components/admin/payments-tabs'
import { StatusBadge } from '@/components/admin/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatCentsStr, formatDate } from '@/lib/format'
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type Paginated,
  type PaymentStats,
  type PaymentView,
} from '@/lib/types'

const LIMIT = 20

function methodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method
}

/** Estorno disponível só para Pix/cartão pagos (boleto não tem estorno programático). */
function canRefund(p: PaymentView): boolean {
  return p.status === 'PAID' && (p.method === 'PIX' || p.method === 'CREDIT_CARD')
}

export function TransactionsClient() {
  const [items, setItems] = useState<PaymentView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [selected, setSelected] = useState<PaymentView | null>(null)
  const [confirmingRefund, setConfirmingRefund] = useState(false)
  const [refunding, setRefunding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (q.trim()) params.set('q', q.trim())
      if (status) params.set('status', status)
      if (method) params.set('method', method)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const page = await apiGet<Paginated<PaymentView>>(`/api/payments/transactions?${params}`)
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar transações.')
    } finally {
      setLoading(false)
    }
  }, [offset, q, status, method, from, to])

  const loadStats = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      setStats(await apiGet<PaymentStats>(`/api/payments/stats?${params}`))
    } catch {
      setStats(null)
    }
  }, [from, to])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  function openDetail(p: PaymentView) {
    setSelected(p)
    setConfirmingRefund(false)
  }

  async function doRefund() {
    if (!selected) return
    setRefunding(true)
    try {
      const updated = await apiSend<PaymentView>(
        `/api/payments/transactions/${selected.id}/refund`,
        'POST',
      )
      toast.success('Estorno solicitado.')
      setSelected(updated)
      setConfirmingRefund(false)
      await Promise.all([load(), loadStats()])
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível estornar.')
    } finally {
      setRefunding(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Pagamentos"
        description="Transações de Pix, boleto e cartão — listar, filtrar e estornar."
      />
      <PaymentsTabs />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          title="Receita (paga)"
          value={stats ? formatCentsStr(stats.paidAmountInCents) : '—'}
          icon={Banknote}
          description="Soma dos pagamentos pagos"
        />
        <OverviewCard
          title="Pagos"
          value={stats ? String(stats.paidCount) : '—'}
          icon={CreditCard}
          description="Transações confirmadas"
        />
        <OverviewCard
          title="Total"
          value={stats ? String(stats.totalCount) : '—'}
          description="Transações no período"
        />
        <OverviewCard
          title="Estornado"
          value={stats ? formatCentsStr(stats.refundedAmountInCents) : '—'}
          icon={Undo2}
          description="Soma dos estornos"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
        <div className="relative flex-1 lg:min-w-[16rem]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por id, txid ou e-mail…"
            value={q}
            onChange={(e) => {
              setOffset(0)
              setQ(e.target.value)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setOffset(0)
            setStatus(e.target.value)
          }}
          className="lg:w-40"
        >
          <option value="">Todos os status</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={method}
          onChange={(e) => {
            setOffset(0)
            setMethod(e.target.value)
          }}
          className="lg:w-36"
        >
          <option value="">Todos os métodos</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {methodLabel(m)}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          aria-label="De"
          value={from}
          onChange={(e) => {
            setOffset(0)
            setFrom(e.target.value)
          }}
          className="lg:w-40"
        />
        <Input
          type="date"
          aria-label="Até"
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
              <TableHead>Cliente</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <Spinner className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhuma transação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id} onClick={() => openDetail(p)} className="cursor-pointer">
                  <TableCell>
                    <div className="font-medium">{p.customer?.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{p.customer?.email ?? p.id}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{methodLabel(p.method)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCentsStr(p.amountInCents, p.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
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
        title="Detalhe da transação"
        description={selected ? methodLabel(selected.method) : undefined}
        footer={
          selected && canRefund(selected) ? (
            confirmingRefund ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setConfirmingRefund(false)}
                  disabled={refunding}
                >
                  Não
                </Button>
                <Button variant="destructive" onClick={doRefund} disabled={refunding}>
                  {refunding ? <Spinner /> : <RotateCcw className="size-4" />}
                  Confirmar estorno
                </Button>
              </>
            ) : (
              <Button variant="destructive" onClick={() => setConfirmingRefund(true)}>
                <Undo2 className="size-4" /> Estornar
              </Button>
            )
          ) : null
        }
      >
        {selected ? <PaymentDetail payment={selected} /> : null}
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

function PaymentDetail({ payment: p }: { payment: PaymentView }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <Field label="Identificador">
          <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{p.id}</code>
        </Field>
      </div>
      <div className="rounded-lg border border-border p-3">
        <Row label="Status" value={<StatusBadge status={p.status} />} />
        <Row label="Valor" value={formatCentsStr(p.amountInCents, p.currency)} />
        <Row label="Método" value={PAYMENT_METHOD_LABELS[p.method] ?? p.method} />
        {p.card ? (
          <Row
            label="Cartão"
            value={`${p.card.brand} ···· ${p.card.last4} (${p.card.installments}x)`}
          />
        ) : null}
        {p.txid ? <Row label="txid" value={<code className="text-xs">{p.txid}</code>} /> : null}
        {p.providerPaymentId ? (
          <Row label="ID provedor" value={<code className="text-xs">{p.providerPaymentId}</code>} />
        ) : null}
      </div>
      <div className="rounded-lg border border-border p-3">
        <Row label="Cliente" value={p.customer?.name ?? '—'} />
        <Row label="E-mail" value={p.customer?.email ?? '—'} />
        <Row label="Documento" value={p.customer?.document ?? '—'} />
        {p.customer?.phone ? <Row label="Telefone" value={p.customer.phone} /> : null}
      </div>
      <div className="rounded-lg border border-border p-3">
        <Row label="Criado" value={formatDate(p.createdAt)} />
        <Row label="Pago" value={formatDate(p.paidAt)} />
        <Row label="Expira" value={formatDate(p.expiresAt)} />
        <Row label="Atualizado" value={formatDate(p.updatedAt)} />
        {p.refundedAt ? <Row label="Estornado" value={formatDate(p.refundedAt)} /> : null}
        <Row label="Consumidor" value={<code className="text-xs">{p.consumerId}</code>} />
        {p.subscriptionId ? (
          <Row label="Assinatura" value={<code className="text-xs">{p.subscriptionId}</code>} />
        ) : null}
      </div>
      {p.failureReason ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {p.failureReason}
        </p>
      ) : null}
    </div>
  )
}
