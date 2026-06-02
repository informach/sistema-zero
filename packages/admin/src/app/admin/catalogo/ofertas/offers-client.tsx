'use client'

import { Pencil, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { CatalogTabs } from '@/components/admin/catalog-tabs'
import { StatusBadge } from '@/components/admin/status-badge'
import { Badge } from '@/components/ui/badge'
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
import { formatCents, reaisToCents } from '@/lib/format'
import type { OfferListItem, Paginated, ProductView } from '@/lib/types'

const LIMIT = 20
const OFFER_STATUSES = ['draft', 'active', 'paused', 'archived']
const PRICING_MODES = ['one_time', 'subscription']

interface FormState {
  productId: string
  code: string
  slug: string
  name: string
  price: string
  compareAt: string
  pricingMode: string
  installmentsMax: string
  guaranteeDays: string
  status: string
}

const EMPTY_FORM: FormState = {
  productId: '',
  code: '',
  slug: '',
  name: '',
  price: '',
  compareAt: '',
  pricingMode: 'one_time',
  installmentsMax: '',
  guaranteeDays: '',
  status: 'draft',
}

function optInt(v: string): number | null {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function OffersClient() {
  const [items, setItems] = useState<OfferListItem[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<ProductView[]>([])

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<OfferListItem | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (q.trim()) params.set('q', q.trim())
      if (status) params.set('status', status)
      const page = await apiGet<Paginated<OfferListItem>>(`/api/catalog/offers?${params}`)
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar ofertas.')
    } finally {
      setLoading(false)
    }
  }, [offset, q, status])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  // Lista de produtos p/ o select da criação de oferta.
  useEffect(() => {
    apiGet<Paginated<ProductView>>('/api/catalog/products?limit=100')
      .then((page) => setProducts(page.items))
      .catch(() => setProducts([]))
  }, [])

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, productId: products[0]?.id ?? '' })
    setOpen(true)
  }

  function openEdit(o: OfferListItem) {
    setEditing(o)
    setForm({
      productId: o.productId,
      code: o.code,
      slug: o.slug,
      name: o.name,
      price: (o.priceCents / 100).toFixed(2),
      compareAt: o.compareAtPriceCents != null ? (o.compareAtPriceCents / 100).toFixed(2) : '',
      pricingMode: o.pricingMode,
      installmentsMax: o.installmentsMax != null ? String(o.installmentsMax) : '',
      guaranteeDays: o.guaranteeDays != null ? String(o.guaranteeDays) : '',
      status: o.status,
    })
    setOpen(true)
  }

  async function save() {
    const priceCents = reaisToCents(form.price)
    if (!form.name.trim() || Number.isNaN(priceCents)) {
      toast.error('Informe nome e preço válidos.')
      return
    }
    if (!editing && (!form.productId || !form.code.trim() || !form.slug.trim())) {
      toast.error('Selecione produto e informe code/slug.')
      return
    }
    const compareAtCents = form.compareAt.trim() ? reaisToCents(form.compareAt) : null
    setSaving(true)
    try {
      if (editing) {
        await apiSend(`/api/catalog/offers/${editing.id}`, 'PATCH', {
          name: form.name,
          priceCents,
          compareAtPriceCents: compareAtCents,
          pricingMode: form.pricingMode,
          installmentsMax: optInt(form.installmentsMax),
          guaranteeDays: optInt(form.guaranteeDays),
          status: form.status,
        })
        toast.success('Oferta atualizada.')
      } else {
        await apiSend('/api/catalog/offers', 'POST', {
          productId: form.productId,
          code: form.code,
          slug: form.slug,
          name: form.name,
          priceCents,
          ...(compareAtCents != null ? { compareAtPriceCents: compareAtCents } : {}),
          pricingMode: form.pricingMode,
          ...(optInt(form.installmentsMax)
            ? { installmentsMax: optInt(form.installmentsMax) }
            : {}),
          ...(optInt(form.guaranteeDays) ? { guaranteeDays: optInt(form.guaranteeDays) } : {}),
          status: form.status,
        })
        toast.success('Oferta criada.')
      }
      setOpen(false)
      await load()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Catálogo"
        description="Produtos, ofertas e cupons da plataforma."
        action={
          <Button onClick={openCreate} disabled={products.length === 0}>
            <Plus className="size-4" /> Nova oferta
          </Button>
        }
      />
      <CatalogTabs />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, slug ou code…"
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
          {OFFER_STATUSES.map((s) => (
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
              <TableHead>Oferta</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Disponível</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <Spinner className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma oferta encontrada.
                </TableCell>
              </TableRow>
            ) : (
              items.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-muted-foreground">{o.slug}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.productName ?? '—'}</TableCell>
                  <TableCell>{formatCents(o.priceCents, o.currency)}</TableCell>
                  <TableCell>
                    {o.isAvailable ? (
                      <Badge variant="success">Sim</Badge>
                    ) : (
                      <Badge variant="muted">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(o)}>
                      <Pencil className="size-4" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar oferta' : 'Nova oferta'}
        description={editing ? editing.name : 'Cadastre uma oferta (preço) de um produto.'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Spinner /> : null}
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!editing ? (
            <>
              <Field label="Produto" htmlFor="productId">
                <Select
                  id="productId"
                  value={form.productId}
                  onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Code" htmlFor="code">
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  />
                </Field>
                <Field label="Slug" htmlFor="oslug">
                  <Input
                    id="oslug"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  />
                </Field>
              </div>
            </>
          ) : null}
          <Field label="Nome" htmlFor="oname">
            <Input
              id="oname"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preço (R$)" htmlFor="price">
              <Input
                id="price"
                inputMode="decimal"
                placeholder="37,00"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </Field>
            <Field label='Preço "de" (R$, opcional)' htmlFor="compareAt">
              <Input
                id="compareAt"
                inputMode="decimal"
                placeholder="97,00"
                value={form.compareAt}
                onChange={(e) => setForm((f) => ({ ...f, compareAt: e.target.value }))}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Modo" htmlFor="pricingMode">
              <Select
                id="pricingMode"
                value={form.pricingMode}
                onChange={(e) => setForm((f) => ({ ...f, pricingMode: e.target.value }))}
              >
                {PRICING_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="ostatus">
              <Select
                id="ostatus"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {OFFER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Máx. parcelas (opcional)" htmlFor="installments">
              <Input
                id="installments"
                inputMode="numeric"
                value={form.installmentsMax}
                onChange={(e) => setForm((f) => ({ ...f, installmentsMax: e.target.value }))}
              />
            </Field>
            <Field label="Garantia (dias, opcional)" htmlFor="guarantee">
              <Input
                id="guarantee"
                inputMode="numeric"
                value={form.guaranteeDays}
                onChange={(e) => setForm((f) => ({ ...f, guaranteeDays: e.target.value }))}
              />
            </Field>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
