'use client'

import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Pagination } from '@sistemazero/ui/pagination'
import { Skeleton } from '@sistemazero/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { Receipt } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/community/status-badge'
import { apiGet } from '@/lib/api'
import { formatCentsStr, formatDate } from '@/lib/format'
import { PAYMENT_METHOD_LABELS, type Paginated, type PaymentView } from '@/lib/types'

const LIMIT = 20

export function PurchasesClient() {
  const [page, setPage] = useState<Paginated<PaymentView> | null>(null)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PaymentView | null>(null)

  const load = useCallback(async (newOffset: number) => {
    setLoading(true)
    try {
      const data = await apiGet<Paginated<PaymentView>>(
        `/api/payments/my?limit=${LIMIT}&offset=${newOffset}`,
      )
      setPage(data)
      setOffset(newOffset)
    } catch {
      toast.error('Não foi possível carregar suas compras.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(0)
  }, [load])

  if (loading && !page) return <PurchasesSkeleton />

  const items = page?.items ?? []

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <Receipt className="size-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Nenhuma compra encontrada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            As compras feitas com o e-mail desta conta aparecem aqui.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((payment) => (
            <TableRow
              key={payment.id}
              className="cursor-pointer"
              onClick={() => setSelected(payment)}
            >
              <TableCell className="whitespace-nowrap">
                {formatDate(payment.paidAt ?? payment.createdAt)}
              </TableCell>
              <TableCell>{payment.description ?? '—'}</TableCell>
              <TableCell className="sz-display whitespace-nowrap">
                {formatCentsStr(payment.amountInCents)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
              </TableCell>
              <TableCell>
                <StatusBadge status={payment.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        total={page?.total ?? 0}
        limit={LIMIT}
        offset={offset}
        onChange={(next) => void load(next)}
      />

      <PurchaseDetail payment={selected} onClose={() => setSelected(null)} />
    </Card>
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
    <Dialog
      open
      onClose={onClose}
      title="Detalhe da compra"
      description={payment.description ?? undefined}
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <DetailRow label="Valor" value={formatCentsStr(payment.amountInCents)} mono />
        <DetailRow label="Método" value={PAYMENT_METHOD_LABELS[payment.method] ?? payment.method} />
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Status</dt>
          <dd className="mt-1">
            <StatusBadge status={payment.status} />
          </dd>
        </div>
        <DetailRow label="Criada em" value={formatDate(payment.createdAt)} />
        <DetailRow label="Paga em" value={formatDate(payment.paidAt)} />
        {payment.card ? (
          <DetailRow
            label="Cartão"
            value={`${payment.card.brand.toUpperCase()} •••• ${payment.card.last4} (${payment.card.installments}x)`}
          />
        ) : null}
        <div className="col-span-2">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Identificador</dt>
          <dd className="mt-1 break-all font-mono text-xs text-muted-foreground">{payment.id}</dd>
        </div>
      </dl>
      {payment.boleto ? (
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs">
          <p className="font-medium">Boleto</p>
          <p className="mt-1 break-all font-mono">{payment.boleto.digitableLine}</p>
          <a
            href={payment.boleto.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-interactive hover:text-interactive-hover"
          >
            Abrir PDF do boleto
          </a>
        </div>
      ) : null}
    </Dialog>
  )
}

// Chaves estáveis das linhas-fantasma da tabela.
const ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']

/** Esqueleto da tabela de compras (no lugar do spinner) — 5 colunas × algumas linhas. */
function PurchasesSkeleton() {
  return (
    <Card aria-busy="true" className="flex flex-col gap-3 p-4">
      <span className="sr-only">Carregando…</span>
      {ROW_KEYS.map((k) => (
        <div key={k} className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] items-center gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-40 max-w-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </Card>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={mono ? 'sz-display mt-1' : 'mt-1'}>{value}</dd>
    </div>
  )
}
