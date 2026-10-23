'use client'

import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Pagination } from '@sistemazero/ui/pagination'
import { Select } from '@sistemazero/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import type { LucideIcon } from 'lucide-react'
import { Ban, CalendarClock, Copy, FilePlus2, Receipt, Search, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { ReadOnlyNotice } from '@/components/admin/read-only-notice'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { type ApiError, apiGet } from '@/lib/api'
import { formatCentsStr, formatDate } from '@/lib/format'
import {
  formatDocument,
  invoiceMainDate,
  invoiceStatusLabel,
  sumStatusCounts,
  truncateAccessKey,
} from '@/lib/nfse'
import { type FiscalStats, INVOICE_STATUSES, type InvoiceList, type InvoiceView } from '@/lib/types'
import { copyToClipboard } from './copy-to-clipboard'
import { InvoiceDetailDialog } from './invoice-detail-dialog'
import { InvoiceStatusBadge } from './invoice-status-badge'
import { ManualInvoiceDialog } from './manual-invoice-dialog'

const LIMIT = 20

/**
 * Um cartão de número que também é filtro: clicar mostra só as notas daquela situação (e
 * clicar de novo volta para todas). Cada cartão conta exatamente o status que filtra.
 */
function FilterCard({
  title,
  value,
  description,
  icon,
  active,
  onClick,
}: {
  title: string
  value: string | number
  description: string
  icon: LucideIcon
  active: boolean
  onClick: () => void
}) {
  const Icon = icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-full flex-col rounded-xl border bg-card p-5 text-left text-card-foreground shadow-sm transition-colors hover:border-primary focus-visible:outline-2 ${active ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </span>
      <span className="mt-2 font-mono text-3xl font-bold tracking-tight">{value}</span>
      <span className="mt-1 text-xs text-muted-foreground">{description}</span>
    </button>
  )
}

/** Lê e limpa um parâmetro da URL (o link "Emitir nota desta venda" chega com `?emitir=`). */
function takeSearchParam(name: string): string | null {
  const url = new URL(window.location.href)
  const value = url.searchParams.get(name)
  if (value === null) return null
  url.searchParams.delete(name)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  return value.trim() || null
}

export function InvoicesClient({ currentRole }: { currentRole: string }) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'
  const [items, setItems] = useState<InvoiceView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState<FiscalStats | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualPaymentId, setManualPaymentId] = useState('')

  // Chegando de Vendas: `?emitir=<paymentId>` abre a emissão à mão já preenchida; `?nota=<id>`
  // abre o detalhe da nota. Os parâmetros saem da URL para não reabrir ao recarregar.
  useEffect(() => {
    const emitir = takeSearchParam('emitir')
    const nota = takeSearchParam('nota')
    if (nota) setSelectedId(nota)
    if (emitir && canWrite) {
      setManualPaymentId(emitir)
      setManualOpen(true)
    }
  }, [canWrite])

  function filterBy(next: string) {
    setOffset(0)
    setStatus((current) => (current === next ? '' : next))
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (q.trim()) params.set('q', q.trim())
      if (status) params.set('status', status)
      const page = await apiGet<InvoiceList>(`/api/nfse/invoices?${params}`)
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'As notas fiscais não carregaram. Tente de novo.')
    } finally {
      setLoading(false)
    }
  }, [offset, q, status])

  const loadStats = useCallback(async () => {
    try {
      setStats(await apiGet<FiscalStats>('/api/nfse/stats'))
    } catch {
      setStats(null)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const refresh = useCallback(async () => {
    await Promise.all([load(), loadStats()])
  }, [load, loadStats])

  const byStatus = stats?.byStatus
  const count = (statuses: string[]) => (byStatus ? sumStatusCounts(byStatus, statuses) : null)
  const cancelFailed = count(['CANCEL_FAILED']) ?? 0
  const cancelPending = count(['CANCEL_PENDING']) ?? 0
  const substituted = count(['SUBSTITUTED']) ?? 0

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Notas fiscais"
        description="As notas saem sozinhas quando a garantia da compra acaba. Aqui você acompanha, baixa, cancela e substitui."
        action={
          <Button
            disabled={!canWrite}
            onClick={() => {
              setManualPaymentId('')
              setManualOpen(true)
            }}
          >
            <FilePlus2 className="size-4" aria-hidden /> Emitir nota à mão
          </Button>
        }
      />
      {canWrite ? null : <ReadOnlyNotice />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FilterCard
          title="Emitidas"
          value={count(['EMITTED']) ?? '—'}
          icon={Receipt}
          description="Notas que saíram certinho"
          active={status === 'EMITTED'}
          onClick={() => filterBy('EMITTED')}
        />
        <FilterCard
          title="Esperando a garantia"
          value={count(['SCHEDULED']) ?? '—'}
          icon={CalendarClock}
          description="Saem sozinhas quando a garantia acabar"
          active={status === 'SCHEDULED'}
          onClick={() => filterBy('SCHEDULED')}
        />
        <FilterCard
          title="Não saíram"
          value={count(['FAILED']) ?? '—'}
          icon={TriangleAlert}
          description={
            cancelFailed > 0
              ? `Precisam de atenção. Mais ${cancelFailed} com cancelamento recusado.`
              : 'Precisam de atenção'
          }
          active={status === 'FAILED'}
          onClick={() => filterBy('FAILED')}
        />
        <FilterCard
          title="Canceladas"
          value={count(['CANCELLED']) ?? '—'}
          icon={Ban}
          description={
            cancelPending + substituted > 0
              ? `Mais ${cancelPending} cancelando e ${substituted} substituídas`
              : 'Canceladas na prefeitura'
          }
          active={status === 'CANCELLED'}
          onClick={() => filterBy('CANCELLED')}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nome, e-mail, CPF, chave ou código da venda"
            aria-label="Buscar notas"
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
          className="sm:w-56"
        >
          <option value="">Todas as situações</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {invoiceStatusLabel(s)}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quem comprou</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Quando</TableHead>
              <TableHead>Chave de acesso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={5} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhuma nota com esses filtros.
                </TableCell>
              </TableRow>
            ) : (
              items.map((inv) => {
                const mainDate = invoiceMainDate(inv)
                const accessKey = inv.accessKey
                return (
                  <TableRow
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="font-medium">{inv.customer.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDocument(inv.customer.document)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCentsStr(inv.amountInCents)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {mainDate.label}
                      </div>
                      <div className="text-xs">{formatDate(mainDate.iso)}</div>
                    </TableCell>
                    <TableCell>
                      {accessKey ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(accessKey, 'Chave de acesso')
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="Copiar a chave de acesso completa"
                          aria-label="Copiar a chave de acesso completa"
                        >
                          {truncateAccessKey(accessKey)}
                          <Copy className="size-3" aria-hidden />
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} />

      <InvoiceDetailDialog
        invoiceId={selectedId}
        canWrite={canWrite}
        onClose={() => setSelectedId(null)}
        onNavigate={setSelectedId}
        onChanged={refresh}
      />

      {canWrite ? (
        <ManualInvoiceDialog
          open={manualOpen}
          initialPaymentId={manualPaymentId}
          onClose={() => setManualOpen(false)}
          onCreated={async (id) => {
            setSelectedId(id)
            await refresh()
          }}
          onOpenInvoice={setSelectedId}
        />
      ) : null}
    </div>
  )
}
