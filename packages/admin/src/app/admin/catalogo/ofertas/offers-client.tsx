'use client'

import { Badge } from '@sistemazero/ui/badge'
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
import { Pencil, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { CatalogTabs } from '@/components/admin/catalog-tabs'
import { StatusBadge } from '@/components/admin/status-badge'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { type OfferItemDraft, OfferItemsEditor } from '@/components/catalog/offer-items-editor'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatCents, reaisToCents } from '@/lib/format'
import { offerCodeSuggestion, offerSlugSuggestion } from '@/lib/slug'
import type { OfferContent, OfferListItem, Paginated, ProductView } from '@/lib/types'

const LIMIT = 20
const OFFER_STATUSES = ['draft', 'active', 'paused', 'archived']
const PRICING_MODES = ['one_time', 'subscription'] as const
const PRICING_MODE_LABELS: Record<string, string> = {
  one_time: 'À vista (pagamento único)',
  subscription: 'Assinatura (recorrente)',
}

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
  maxProfiles: string
  status: string
  items: OfferItemDraft[]
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
  maxProfiles: '',
  status: 'draft',
  items: [],
}

/** Teto de perfis kids (espelha o DTO do catálogo: `maxProfiles` 1..50). */
const MAX_KIDS_PROFILES = 50

function optInt(v: string): number | null {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Mescla o `maxProfiles` no `content` existente da oferta SEM apagar os demais campos
 * (badge/cta/cupom). `max` nulo → remove o teto. Objeto vazio → `null`.
 */
function mergeOfferContent(base: OfferContent | null, max: number | null): OfferContent | null {
  const { maxProfiles: _drop, ...rest } = base ?? {}
  const merged: OfferContent = max != null ? { ...rest, maxProfiles: max } : rest
  return Object.keys(merged).length > 0 ? merged : null
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
  // Auto-geração de slug/code a partir de produto + preço + modo (só na criação).
  // Edição manual do campo (dirty) desliga a regeneração daquele campo.
  const [slugDirty, setSlugDirty] = useState(false)
  const [codeDirty, setCodeDirty] = useState(false)

  /** Recalcula slug/code sugeridos sobre um form já atualizado (criação). */
  function withSuggestions(f: FormState, dirty = { slug: slugDirty, code: codeDirty }): FormState {
    const product = products.find((p) => p.id === f.productId)
    if (!product) return f
    const input = {
      productName: product.name,
      priceCents: reaisToCents(f.price),
      mode: f.pricingMode === 'subscription' ? ('subscription' as const) : ('one_time' as const),
    }
    return {
      ...f,
      ...(dirty.slug ? {} : { slug: offerSlugSuggestion(input) }),
      ...(dirty.code ? {} : { code: offerCodeSuggestion(input) }),
    }
  }

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
    setSlugDirty(false)
    setCodeDirty(false)
    setForm(
      withSuggestions(
        { ...EMPTY_FORM, productId: products[0]?.id ?? '' },
        { slug: false, code: false },
      ),
    )
    setOpen(true)
  }

  function openEdit(o: OfferListItem) {
    setEditing(o)
    setSlugDirty(true)
    setCodeDirty(true)
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
      maxProfiles: o.content?.maxProfiles != null ? String(o.content.maxProfiles) : '',
      status: o.status,
      items: [...o.items]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((it) => ({
          productId: it.productId,
        })),
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
    // Teto de perfis (kids) da OFERTA, clampado 1..50; mesclado no `content` sem apagar o resto.
    const maxP = optInt(form.maxProfiles)
    const maxProfiles = maxP ? Math.min(maxP, MAX_KIDS_PROFILES) : null
    setSaving(true)
    try {
      // PATCH substitui a coleção de itens — envia sempre o estado completo do editor.
      const items = form.items.map((it, i) => ({ productId: it.productId, sortOrder: i }))
      if (editing) {
        await apiSend(`/api/catalog/offers/${editing.id}`, 'PATCH', {
          name: form.name,
          priceCents,
          compareAtPriceCents: compareAtCents,
          pricingMode: form.pricingMode,
          installmentsMax: optInt(form.installmentsMax),
          guaranteeDays: optInt(form.guaranteeDays),
          content: mergeOfferContent(editing.content, maxProfiles),
          status: form.status,
          items,
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
          ...(maxProfiles ? { content: { maxProfiles } } : {}),
          status: form.status,
          ...(items.length ? { items } : {}),
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
              <TableSkeletonRows columns={6} />
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
            <Field
              label="Produto"
              htmlFor="productId"
              tooltip="O produto que esta oferta vende. Slug e code são gerados a partir dele + preço + modo."
            >
              <Select
                id="productId"
                value={form.productId}
                onChange={(e) =>
                  setForm((f) => withSuggestions({ ...f, productId: e.target.value }))
                }
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field
            label="Nome"
            htmlFor="oname"
            tooltip="Título da oferta exibido no painel e no funil (ex.: 'Oferta de lançamento')."
          >
            <Input
              id="oname"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Preço (R$)"
              htmlFor="price"
              tooltip="Preço cobrado no checkout. É o valor autoritativo desta oferta."
            >
              <Input
                id="price"
                inputMode="decimal"
                placeholder="37,00"
                value={form.price}
                onChange={(e) => setForm((f) => withSuggestions({ ...f, price: e.target.value }))}
              />
            </Field>
            <Field
              label='Preço "de" (R$, opcional)'
              htmlFor="compareAt"
              tooltip="Preço cheio exibido riscado ao lado do preço real, para mostrar o desconto."
            >
              <Input
                id="compareAt"
                inputMode="decimal"
                placeholder="97,00"
                value={form.compareAt}
                onChange={(e) => setForm((f) => ({ ...f, compareAt: e.target.value }))}
              />
            </Field>
          </div>
          {!editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Slug"
                htmlFor="oslug"
                tooltip="Parte do link público de checkout (ex.: /ofertas/no-comando-da-ia-97-a-vista). Gerado de produto + preço + modo; edite antes de salvar se quiser outro. Não muda depois de criado."
              >
                <Input
                  id="oslug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugDirty(true)
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }}
                />
              </Field>
              <Field
                label="Code"
                htmlFor="code"
                tooltip="Identificador interno e estável da oferta (relatórios/integrações) — não aparece para o cliente. Gerado automaticamente; não muda depois de criado."
              >
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => {
                    setCodeDirty(true)
                    setForm((f) => ({ ...f, code: e.target.value }))
                  }}
                />
              </Field>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Modo"
              htmlFor="pricingMode"
              tooltip="À vista: pagamento único. Assinatura: cobrança recorrente no cartão."
            >
              <Select
                id="pricingMode"
                value={form.pricingMode}
                onChange={(e) =>
                  setForm((f) => withSuggestions({ ...f, pricingMode: e.target.value }))
                }
              >
                {PRICING_MODES.map((m) => (
                  <option key={m} value={m}>
                    {PRICING_MODE_LABELS[m] ?? m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Status"
              htmlFor="ostatus"
              tooltip="draft: não vende ainda. active: à venda. paused: venda suspensa. archived: encerrada (sem volta)."
            >
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
            <Field
              label="Máx. parcelas (opcional)"
              htmlFor="installments"
              tooltip="Máximo de parcelas no cartão. Vazio = padrão do checkout."
            >
              <Input
                id="installments"
                inputMode="numeric"
                value={form.installmentsMax}
                onChange={(e) => setForm((f) => ({ ...f, installmentsMax: e.target.value }))}
              />
            </Field>
            <Field
              label="Garantia (dias, opcional)"
              htmlFor="guarantee"
              tooltip="Dias de garantia/reembolso prometidos na página de venda."
            >
              <Input
                id="guarantee"
                inputMode="numeric"
                value={form.guaranteeDays}
                onChange={(e) => setForm((f) => ({ ...f, guaranteeDays: e.target.value }))}
              />
            </Field>
          </div>
          <Field
            label="Quantidade de perfis (plataforma Kids)"
            htmlFor="maxProfiles"
            tooltip="Quantos perfis de criança (estilo Netflix) ESTA oferta libera. O responsável cria até esse número de perfis. Deixe VAZIO fora da plataforma Kids. Inteiro de 1 a 50."
          >
            <Input
              id="maxProfiles"
              inputMode="numeric"
              placeholder="Ex.: 2 (vazio = sem limite de perfis)"
              value={form.maxProfiles}
              onChange={(e) => setForm((f) => ({ ...f, maxProfiles: e.target.value }))}
            />
          </Field>
          <Field
            label="Bônus / Itens extras"
            tooltip="Produtos entregues junto com o principal, só nesta oferta (ex.: planilha bônus). Quem compra recebe acesso a tudo."
          >
            <OfferItemsEditor
              products={products}
              value={form.items}
              onChange={(items) => setForm((f) => ({ ...f, items }))}
              mainProductId={form.productId}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  )
}
