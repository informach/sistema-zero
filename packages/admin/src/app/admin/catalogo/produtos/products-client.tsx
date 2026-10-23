'use client'

import { buttonVariants } from '@sistemazero/ui/button'
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
import { Pencil, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { CatalogTabs } from '@/components/admin/catalog-tabs'
import { StatusBadge, statusLabel } from '@/components/admin/status-badge'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { type ApiError, apiGet } from '@/lib/api'
import type { Paginated, ProductView } from '@/lib/types'

const LIMIT = 20
const PRODUCT_STATUSES = ['draft', 'active', 'archived']

/** Rótulos PT-BR dos tipos de produto. */
const KIND_LABELS: Record<string, string> = {
  ebook: 'E-book',
  course: 'Curso',
  template_kit: 'Kit de templates',
  community: 'Comunidade',
  service: 'Serviço',
  bundle: 'Combo',
  other: 'Outro',
}

export function ProductsClient() {
  const [items, setItems] = useState<ProductView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (q.trim()) params.set('q', q.trim())
      if (status) params.set('status', status)
      const page = await apiGet<Paginated<ProductView>>(`/api/catalog/products?${params}`)
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Os produtos não carregaram. Tente de novo.')
    } finally {
      setLoading(false)
    }
  }, [offset, q, status])

  // Debounce da busca + recarga ao mudar filtros/página.
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Catálogo"
        description="O produto é o que a pessoa ganha. A oferta é como ele é vendido: preço, forma e prazo. O cupom dá desconto em ofertas."
        action={
          <Link href="/admin/catalogo/produtos/novo" className={buttonVariants()}>
            <Plus className="size-4" aria-hidden /> Novo produto
          </Link>
        }
      />
      <CatalogTabs />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Nome, endereço ou código interno"
            aria-label="Buscar produtos"
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
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s, 'catalog')}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Código interno</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={5} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum produto com esses filtros.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.slug}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {KIND_LABELS[p.kind] ?? p.kind}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} kind="catalog" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/catalogo/produtos/${p.id}`}
                      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                      aria-label={`Editar ${p.name}`}
                    >
                      <Pencil className="size-4" aria-hidden /> Editar
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} />
    </div>
  )
}
