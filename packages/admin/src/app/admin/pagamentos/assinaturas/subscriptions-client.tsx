'use client'

import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
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
import { Ban, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { PaymentsTabs } from '@/components/admin/payments-tabs'
import { StatusBadge } from '@/components/admin/status-badge'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatCentsStr, formatDate } from '@/lib/format'
import { type Paginated, SUBSCRIPTION_STATUSES, type SubscriptionView } from '@/lib/types'

const LIMIT = 20

function canCancel(s: SubscriptionView): boolean {
  return s.status === 'ACTIVE' || s.status === 'PENDING'
}

function intervalLabel(months: number): string {
  if (months === 1) return 'Mensal'
  if (months === 12) return 'Anual'
  return `${months} meses`
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
      toast.error((err as ApiError).message ?? 'Falha ao carregar assinaturas.')
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
      toast.success('Assinatura cancelada.')
      setSelected(updated)
      setConfirmingCancel(false)
      await load()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível cancelar.')
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Pagamentos"
        description={
          canWrite
            ? 'Assinaturas recorrentes (cartão) — acompanhar e cancelar.'
            : 'Assinaturas recorrentes (cartão) — acompanhar.'
        }
      />
      <PaymentsTabs />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por id ou id do provedor…"
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
          className="sm:w-44"
        >
          <option value="">Todos os status</option>
          {SUBSCRIPTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assinatura</TableHead>
              <TableHead className="text-right">Valor/ciclo</TableHead>
              <TableHead>Intervalo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ciclos</TableHead>
              <TableHead>Criada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={6} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma assinatura encontrada.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id} onClick={() => setSelected(s)} className="cursor-pointer">
                  <TableCell>
                    <div className="font-medium">{s.description ?? 'Assinatura'}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.card.brand} ···· {s.card.last4}
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
        title="Detalhe da assinatura"
        footer={
          selected && canWrite && canCancel(selected) ? (
            confirmingCancel ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={canceling}
                >
                  Não
                </Button>
                <Button variant="destructive" onClick={doCancel} disabled={canceling}>
                  {canceling ? <Spinner /> : <Ban className="size-4" />}
                  Confirmar cancelamento
                </Button>
              </>
            ) : (
              <Button variant="destructive" onClick={() => setConfirmingCancel(true)}>
                <Ban className="size-4" /> Cancelar assinatura
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
      <Field label="Identificador">
        <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{s.id}</code>
      </Field>
      <div className="rounded-lg border border-border p-3">
        <Row label="Status" value={<StatusBadge status={s.status} />} />
        <Row label="Valor/ciclo" value={formatCentsStr(s.amountInCents, s.currency)} />
        <Row label="Intervalo" value={intervalLabel(s.intervalMonths)} />
        <Row label="Repetições" value={s.repeats ? String(s.repeats) : 'Ilimitada'} />
        <Row label="Ciclos cobrados" value={String(s.cyclesCompleted)} />
        <Row label="Cartão" value={`${s.card.brand} ···· ${s.card.last4}`} />
      </div>
      <div className="rounded-lg border border-border p-3">
        <Row label="Criada" value={formatDate(s.createdAt)} />
        <Row label="Último ciclo" value={formatDate(s.lastChargeAt)} />
        <Row label="Cancelada" value={formatDate(s.canceledAt)} />
        <Row label="Consumidor" value={<code className="text-xs">{s.consumerId}</code>} />
        {s.providerSubscriptionId ? (
          <Row
            label="ID provedor"
            value={<code className="text-xs">{s.providerSubscriptionId}</code>}
          />
        ) : null}
      </div>
    </div>
  )
}
