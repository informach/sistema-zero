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
import { Ban, CalendarClock, Copy, FilePlus2, Receipt, Search, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { OverviewCard } from '@/components/admin/overview-card'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { type ApiError, apiGet } from '@/lib/api'
import { formatCentsStr, formatDate } from '@/lib/format'
import {
  formatDocument,
  formatDps,
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

export function InvoicesClient() {
  const [items, setItems] = useState<InvoiceView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState<FiscalStats | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)

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
      toast.error((err as ApiError).message ?? 'Falha ao carregar notas fiscais.')
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

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Notas fiscais"
        description="NFS-e emitidas automaticamente após a garantia — acompanhar, baixar, cancelar e substituir."
        action={
          <Button onClick={() => setManualOpen(true)}>
            <FilePlus2 className="size-4" /> Emitir manualmente
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          title="Emitidas"
          value={byStatus ? sumStatusCounts(byStatus, ['EMITTED']) : '—'}
          icon={Receipt}
          description="Notas emitidas com sucesso"
        />
        <OverviewCard
          title="Agendadas"
          value={byStatus ? sumStatusCounts(byStatus, ['SCHEDULED']) : '—'}
          icon={CalendarClock}
          description="Aguardando o fim da garantia"
        />
        <OverviewCard
          title="Falhas"
          value={byStatus ? sumStatusCounts(byStatus, ['FAILED']) : '—'}
          icon={TriangleAlert}
          description="Emissões que precisam de atenção"
        />
        <OverviewCard
          title="Canceladas"
          value={
            byStatus
              ? sumStatusCounts(byStatus, ['CANCEL_PENDING', 'CANCELLED', 'SUBSTITUTED'])
              : '—'
          }
          icon={Ban}
          description="Incl. pendentes e substituídas"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, CPF ou chave…"
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
          className="sm:w-56"
        >
          <option value="">Todos os status</option>
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
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>DPS</TableHead>
              <TableHead>Chave de acesso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={6} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma nota fiscal encontrada.
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
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDps(inv.dpsSeries, inv.dpsNumber)}
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
                        >
                          {truncateAccessKey(accessKey)}
                          <Copy className="size-3" />
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
        onClose={() => setSelectedId(null)}
        onNavigate={setSelectedId}
        onChanged={refresh}
      />

      <ManualInvoiceDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onCreated={async (id) => {
          setSelectedId(id)
          await refresh()
        }}
        onOpenInvoice={setSelectedId}
      />
    </div>
  )
}
