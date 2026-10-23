'use client'

import { Button } from '@sistemazero/ui/button'
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
import { Ban, Copy, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { PaymentsTabs } from '@/components/admin/payments-tabs'
import { ReadOnlyNotice } from '@/components/admin/read-only-notice'
import { StatusBadge, statusLabel } from '@/components/admin/status-badge'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatCentsStr, formatDate } from '@/lib/format'
import { type Paginated, SUBSCRIPTION_STATUSES, type SubscriptionView } from '@/lib/types'
import { copyToClipboard } from '../../notas-fiscais/copy-to-clipboard'

const LIMIT = 20

function canCancel(s: SubscriptionView): boolean {
  return s.status === 'ACTIVE' || s.status === 'PENDING'
}

function intervalLabel(months: number): string {
  if (months === 1) return 'Mensal'
  if (months === 12) return 'Anual'
  return `A cada ${months} meses`
}

export function SubscriptionsClient({ currentRole }: { currentRole: string }) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'
  const [items, setItems] = useState<SubscriptionView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState<SubscriptionView | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [canceling, setCanceling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (q.trim()) params.set('q', q.trim())
      if (status) params.set('status', status)
      const page = await apiGet<Paginated<SubscriptionView>>(
        `/api/payments/subscriptions?${params}`,
      )
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'As assinaturas não carregaram. Tente de novo.')
    } finally {
      setLoading(false)
    }
  }, [offset, q, status])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  async function doCancel() {
    if (!selected) return
    setCanceling(true)
    try {
      const updated = await apiSend<SubscriptionView>(
        `/api/payments/subscriptions/${selected.id}`,
        'DELETE',
      )
      toast.success('Assinatura cancelada. Não haverá novas cobranças.')
      setSelected(updated)
      setConfirmingCancel(false)
      await load()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'A assinatura não foi cancelada. Tente de novo.')
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Vendas"
        description="As assinaturas recorrentes no cartão: quanto pagam e se estão em dia."
      />
      <PaymentsTabs />
      {canWrite ? null : <ReadOnlyNotice />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="E-mail ou código da assinatura"
            aria-label="Buscar assinaturas"
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
          className="sm:w-44"
        >
          <option value="">Todas as situações</option>
          {SUBSCRIPTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assinatura</TableHead>
              <TableHead className="text-right">Valor por cobrança</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Cobranças feitas</TableHead>
              <TableHead>Começou em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={6} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma assinatura com esses filtros.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id} onClick={() => setSelected(s)} className="cursor-pointer">
                  <TableCell>
                    <div className="font-medium">{s.description ?? 'Assinatura'}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.card.brand} final {s.card.last4}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCentsStr(s.amountInCents, s.currency)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {intervalLabel(s.intervalMonths)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {s.cyclesCompleted}
                    {s.repeats ? `/${s.repeats}` : ''}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(s.createdAt)}
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
        onClose={() => {
          setSelected(null)
          setConfirmingCancel(false)
        }}
        title="Assinatura"
        description={selected?.description ?? undefined}
        footer={
          selected && canWrite && canCancel(selected) ? (
            confirmingCancel ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={canceling}
                >
                  Não cancelar
                </Button>
                <Button variant="destructive" onClick={doCancel} disabled={canceling}>
                  {canceling ? <Spinner /> : <Ban className="size-4" aria-hidden />}
                  Sim, cancelar
                </Button>
              </>
            ) : (
              <Button variant="destructive" onClick={() => setConfirmingCancel(true)}>
                <Ban className="size-4" aria-hidden /> Cancelar assinatura
              </Button>
            )
          ) : null
        }
      >
        {selected ? <SubscriptionDetail subscription={selected} /> : null}
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

function SubscriptionDetail({ subscription: s }: { subscription: SubscriptionView }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="rounded-lg border border-border p-3">
        <Row label="Situação" value={<StatusBadge status={s.status} />} />
        <Row label="Valor por cobrança" value={formatCentsStr(s.amountInCents, s.currency)} />
        <Row label="De quanto em quanto tempo" value={intervalLabel(s.intervalMonths)} />
        <Row label="Quantas cobranças" value={s.repeats ? String(s.repeats) : 'Sem fim'} />
        <Row label="Cobranças feitas" value={String(s.cyclesCompleted)} />
        <Row label="Cartão" value={`${s.card.brand} final ${s.card.last4}`} />
      </div>
      <div className="rounded-lg border border-border p-3">
        <Row label="Começou em" value={formatDate(s.createdAt)} />
        <Row label="Última cobrança" value={formatDate(s.lastChargeAt)} />
        <Row label="Cancelada em" value={formatDate(s.canceledAt)} />
      </div>
      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
        <div className="mt-2">
          <Row
            label="Código da assinatura"
            value={<CopyCode value={s.id} label="Código da assinatura" />}
          />
          <Row
            label="Código de quem assina"
            value={<CopyCode value={s.consumerId} label="Código de quem assina" />}
          />
          {s.providerSubscriptionId ? (
            <Row
              label="Código no provedor"
              value={<CopyCode value={s.providerSubscriptionId} label="Código no provedor" />}
            />
          ) : null}
        </div>
      </details>
    </div>
  )
}

/** Código técnico com botão de copiar. */
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
