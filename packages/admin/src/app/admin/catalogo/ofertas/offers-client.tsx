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
import { communityPage, useCommunityRequests } from '@/components/admin/community-page'
import { LoadError } from '@/components/admin/empty-state'
import { StatusBadge, statusLabel } from '@/components/admin/status-badge'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { useConfirm } from '@/components/admin/use-confirm'
import { type OfferItemDraft, OfferItemsEditor } from '@/components/catalog/offer-items-editor'
import type { ApiError } from '@/lib/api'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import { formatCents, reaisToCents } from '@/lib/format'
import { loadAllPages } from '@/lib/load-all-pages'
import type { Platform } from '@/lib/platform'
import { offerCodeSuggestion, offerSlugSuggestion } from '@/lib/slug'
import type {
  AccessDurationUnit,
  AccessMode,
  OfferContent,
  OfferListItem,
  Paginated,
  PricingMode,
  ProductView,
} from '@/lib/types'

const LIMIT = 20
const OFFER_STATUSES = ['draft', 'active', 'paused', 'archived']
const PRICING_MODES = ['one_time', 'subscription'] as const
const PRICING_MODE_LABELS: Record<string, string> = {
  one_time: 'À vista (paga uma vez)',
  subscription: 'Assinatura (cobra todo período)',
}

const BILLING_INTERVALS = [
  { value: '1', label: 'Mensal (cobra todo mês)' },
  { value: '12', label: 'Anual (cobra uma vez por ano)' },
] as const

const ACCESS_MODE_LABELS: Record<AccessMode, string> = {
  lifetime: 'Vitalício',
  fixed: 'Prazo fixo',
  billing_cycle: 'Enquanto a assinatura estiver ativa',
}

const ACCESS_DURATION_UNIT_LABELS: Record<AccessDurationUnit, string> = {
  days: 'dias',
  months: 'meses',
}

interface FormState {
  productId: string
  code: string
  slug: string
  name: string
  price: string
  compareAt: string
  pricingMode: PricingMode
  billingInterval: string
  accessMode: AccessMode | ''
  accessDurationValue: string
  accessDurationUnit: AccessDurationUnit | ''
  altOfferSlug: string
  altOfferLabel: string
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
  billingInterval: '',
  accessMode: 'lifetime',
  accessDurationValue: '',
  accessDurationUnit: '',
  altOfferSlug: '',
  altOfferLabel: '',
  installmentsMax: '',
  guaranteeDays: '',
  maxProfiles: '',
  status: 'draft',
  items: [],
}

/** Teto de perfis kids (espelha o DTO do catálogo: `maxProfiles` 1..50). */
const MAX_KIDS_PROFILES = 50

interface AccessPolicyFormInput {
  pricingMode: PricingMode
  accessMode: AccessMode | ''
  accessDurationValue: string
  accessDurationUnit: AccessDurationUnit | ''
  status: string
}

export interface OfferAccessPolicyPayload {
  accessMode: AccessMode
  accessDurationValue: number | null
  accessDurationUnit: AccessDurationUnit | null
}

export interface OfferAccessPolicyErrors {
  accessMode?: string
  accessDurationValue?: string
  accessDurationUnit?: string
}

export function validateOfferAccessPolicyForm(input: AccessPolicyFormInput): {
  payload: OfferAccessPolicyPayload | null
  errors: OfferAccessPolicyErrors
} {
  if (input.pricingMode === 'subscription') {
    return {
      payload: {
        accessMode: 'billing_cycle',
        accessDurationValue: null,
        accessDurationUnit: null,
      },
      errors: {},
    }
  }

  if (input.accessMode !== 'lifetime' && input.accessMode !== 'fixed') {
    return { payload: null, errors: { accessMode: 'Escolha Vitalício ou Prazo fixo.' } }
  }
  if (input.accessMode === 'lifetime') {
    return {
      payload: { accessMode: 'lifetime', accessDurationValue: null, accessDurationUnit: null },
      errors: {},
    }
  }

  const rawValue = input.accessDurationValue.trim()
  const value = rawValue === '' ? null : Number(rawValue)
  const hasValidValue = value !== null && Number.isInteger(value) && value > 0
  const unit = input.accessDurationUnit || null
  const errors: OfferAccessPolicyErrors = {}
  if (value !== null && !hasValidValue) {
    errors.accessDurationValue = 'Informe uma duração inteira maior que zero.'
  }
  if (rawValue && !unit) errors.accessDurationUnit = 'Escolha dias ou meses.'
  if (!rawValue && unit) errors.accessDurationValue = 'Informe a duração do acesso.'
  if (input.status === 'active') {
    if (!rawValue) errors.accessDurationValue = 'Para publicar, informe a duração do acesso.'
    if (!unit) errors.accessDurationUnit = 'Para publicar, escolha dias ou meses.'
  }
  if (Object.keys(errors).length > 0) return { payload: null, errors }

  return {
    payload: {
      accessMode: 'fixed',
      accessDurationValue: hasValidValue ? value : null,
      accessDurationUnit: unit,
    },
    errors: {},
  }
}

export function offerAccessSummary(
  offer: Pick<
    OfferListItem,
    'pricingMode' | 'accessMode' | 'accessDurationValue' | 'accessDurationUnit'
  >,
): string {
  if (offer.pricingMode === 'subscription' || offer.accessMode === 'billing_cycle') {
    return ACCESS_MODE_LABELS.billing_cycle
  }
  if (offer.accessMode === 'lifetime') return ACCESS_MODE_LABELS.lifetime
  if (offer.accessDurationValue && offer.accessDurationUnit) {
    return `${offer.accessDurationValue} ${ACCESS_DURATION_UNIT_LABELS[offer.accessDurationUnit]}`
  }
  return ACCESS_MODE_LABELS.fixed
}

function optInt(v: string): number | null {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Slug da oferta irmã do alternador (espelha o pattern do DTO do catálogo). */
const ALT_OFFER_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Mescla `maxProfiles` e `altOffer` no `content` existente da oferta SEM apagar os
 * demais campos (badge/cta/cupom). Valor nulo → remove o campo. Objeto vazio → `null`.
 */
function mergeOfferContent(
  base: OfferContent | null,
  max: number | null,
  altOffer: { slug: string; label?: string } | null,
): OfferContent | null {
  const { maxProfiles: _dropMax, altOffer: _dropAlt, ...rest } = base ?? {}
  const merged: OfferContent = {
    ...rest,
    ...(max != null ? { maxProfiles: max } : {}),
    ...(altOffer ? { altOffer } : {}),
  }
  return Object.keys(merged).length > 0 ? merged : null
}

/** Um grupo do formulário da oferta, com título (o formulário tem uns vinte campos). */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border p-4">
      <legend className="px-1 font-display text-base font-bold">{title}</legend>
      {children}
    </fieldset>
  )
}

export const OffersClient = communityPage(OffersForCommunity)

function OffersForCommunity({ audience }: { audience: Platform }) {
  const { get: apiGet, send: apiSend } = useCommunityRequests(audience)
  const [items, setItems] = useState<OfferListItem[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [products, setProducts] = useState<ProductView[]>([])

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<OfferListItem | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [accessErrors, setAccessErrors] = useState<OfferAccessPolicyErrors>({})
  const [saving, setSaving] = useState(false)
  const { confirm, confirmDialog } = useConfirm()
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
      setLoadError(false)
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      setLoadError(true)
      setItems([])
      setTotal(0)
      toast.error((err as ApiError).message ?? 'As ofertas não carregaram. Tente de novo.')
    } finally {
      setLoading(false)
    }
  }, [offset, q, status, apiGet])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  // Lista de produtos p/ o select da criação de oferta.
  useEffect(() => {
    loadAllPages((offset, limit) =>
      apiGet<Paginated<ProductView>>(`/api/catalog/products?offset=${offset}&limit=${limit}`),
    )
      .then(setProducts)
      .catch((err) => {
        if (!isCanceledCommunityRequest(err))
          toast.error(
            'Os produtos desta comunidade não carregaram. Recarregue a página antes de criar uma oferta.',
          )
      })
  }, [apiGet])

  function openCreate() {
    setEditing(null)
    setSlugDirty(false)
    setCodeDirty(false)
    setAccessErrors({})
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
    setAccessErrors({})
    setForm({
      productId: o.productId,
      code: o.code,
      slug: o.slug,
      name: o.name,
      price: (o.priceCents / 100).toFixed(2),
      compareAt: o.compareAtPriceCents != null ? (o.compareAtPriceCents / 100).toFixed(2) : '',
      pricingMode: o.pricingMode,
      billingInterval: o.billingIntervalMonths != null ? String(o.billingIntervalMonths) : '',
      accessMode: o.accessMode ?? (o.pricingMode === 'subscription' ? 'billing_cycle' : 'lifetime'),
      accessDurationValue: o.accessDurationValue != null ? String(o.accessDurationValue) : '',
      accessDurationUnit: o.accessDurationUnit ?? '',
      altOfferSlug: o.content?.altOffer?.slug ?? '',
      altOfferLabel: o.content?.altOffer?.label ?? '',
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

  function applyAccessMode(accessMode: AccessMode) {
    setAccessErrors({})
    setForm((current) => ({
      ...current,
      accessMode,
      ...(accessMode === 'fixed' ? {} : { accessDurationValue: '', accessDurationUnit: '' }),
    }))
  }

  function changeAccessMode(accessMode: AccessMode | '') {
    if (accessMode === '') {
      setAccessErrors({})
      setForm((current) => ({
        ...current,
        accessMode: '',
        accessDurationValue: '',
        accessDurationUnit: '',
      }))
      return
    }
    const discardsDuration =
      accessMode === 'lifetime' &&
      form.accessMode === 'fixed' &&
      Boolean(form.accessDurationValue || form.accessDurationUnit)
    if (!discardsDuration) {
      applyAccessMode(accessMode)
      return
    }
    confirm({
      title: 'Tornar o acesso vitalício?',
      message: 'O prazo que você preencheu sai desta oferta.',
      confirmText: 'Tornar vitalício',
      onConfirm: () => applyAccessMode('lifetime'),
    })
  }

  function changePricingMode(pricingMode: PricingMode) {
    setAccessErrors({})
    setForm((current) =>
      withSuggestions({
        ...current,
        pricingMode,
        accessMode:
          pricingMode === 'subscription'
            ? 'billing_cycle'
            : current.pricingMode === 'subscription'
              ? ''
              : current.accessMode,
        accessDurationValue:
          pricingMode === 'subscription' || current.pricingMode === 'subscription'
            ? ''
            : current.accessDurationValue,
        accessDurationUnit:
          pricingMode === 'subscription' || current.pricingMode === 'subscription'
            ? ''
            : current.accessDurationUnit,
      }),
    )
  }

  async function save() {
    const priceCents = reaisToCents(form.price)
    if (!form.name.trim() || Number.isNaN(priceCents)) {
      toast.error('Preencha o nome e um preço válido.')
      return
    }
    if (!editing && (!form.productId || !form.code.trim() || !form.slug.trim())) {
      toast.error('Escolha o produto e preencha o endereço e o código.')
      return
    }
    const compareAtCents = form.compareAt.trim() ? reaisToCents(form.compareAt) : null
    const isSubscription = form.pricingMode === 'subscription'
    const accessPolicy = validateOfferAccessPolicyForm(form)
    if (!accessPolicy.payload) {
      setAccessErrors(accessPolicy.errors)
      toast.error('Confira o acesso da oferta, em Acesso e garantia.')
      return
    }
    setAccessErrors({})
    // Assinatura exige a periodicidade (o payments monta o plano Efí a partir dela).
    const billingIntervalMonths = isSubscription ? optInt(form.billingInterval) : null
    if (isSubscription && billingIntervalMonths == null) {
      toast.error('Na assinatura, escolha se cobra todo mês ou todo ano.')
      return
    }
    // Oferta irmã do alternador mensal↔anual (só faz sentido em assinatura).
    const altSlug = form.altOfferSlug.trim().toLowerCase()
    if (altSlug && !ALT_OFFER_SLUG_RE.test(altSlug)) {
      toast.error('O endereço da outra oferta só pode ter letras minúsculas, números e hífens.')
      return
    }
    const altLabel = form.altOfferLabel.trim()
    const altOffer =
      isSubscription && altSlug ? { slug: altSlug, ...(altLabel ? { label: altLabel } : {}) } : null
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
          ...accessPolicy.payload,
          billingIntervalMonths,
          // Assinatura recorrente não parcela (a Efí cobra 1x por ciclo).
          installmentsMax: isSubscription ? null : optInt(form.installmentsMax),
          guaranteeDays: optInt(form.guaranteeDays),
          content: mergeOfferContent(editing.content, maxProfiles, altOffer),
          status: form.status,
          items,
        })
        toast.success('Oferta atualizada.')
      } else {
        const content = mergeOfferContent(null, maxProfiles, altOffer)
        await apiSend('/api/catalog/offers', 'POST', {
          productId: form.productId,
          code: form.code,
          slug: form.slug,
          name: form.name,
          priceCents,
          ...(compareAtCents != null ? { compareAtPriceCents: compareAtCents } : {}),
          pricingMode: form.pricingMode,
          ...accessPolicy.payload,
          ...(billingIntervalMonths != null ? { billingIntervalMonths } : {}),
          ...(!isSubscription && optInt(form.installmentsMax)
            ? { installmentsMax: optInt(form.installmentsMax) }
            : {}),
          ...(optInt(form.guaranteeDays) ? { guaranteeDays: optInt(form.guaranteeDays) } : {}),
          ...(content ? { content } : {}),
          status: form.status,
          ...(items.length ? { items } : {}),
        })
        toast.success('Oferta criada.')
      }
      setOpen(false)
      await load()
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      toast.error((err as ApiError).message ?? 'Não deu para salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Catálogo"
        description="O produto é o que a pessoa ganha. A oferta é como ele é vendido: preço, forma e prazo. O cupom dá desconto em ofertas."
        action={
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={openCreate}
              disabled={products.length === 0}
              aria-describedby={products.length === 0 ? 'nova-oferta-motivo' : undefined}
            >
              <Plus className="size-4" aria-hidden /> Nova oferta
            </Button>
            {products.length === 0 ? (
              <p id="nova-oferta-motivo" className="text-xs text-muted-foreground">
                Crie um produto antes de criar uma oferta.
              </p>
            ) : null}
          </div>
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
            placeholder="Nome, endereço ou código"
            aria-label="Buscar ofertas"
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
          {OFFER_STATUSES.map((s) => (
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
              <TableHead>Oferta</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>À venda agora</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={6} />
            ) : loadError ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <LoadError what="a lista desta comunidade" onRetry={() => void load()} />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma oferta com esses filtros.
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
                  <TableCell>
                    <div>
                      {formatCents(o.priceCents, o.currency)}
                      {o.pricingMode === 'subscription' ? (
                        <span className="text-xs text-muted-foreground">
                          {o.billingIntervalMonths === 12
                            ? '/ano'
                            : o.billingIntervalMonths === 1
                              ? '/mês'
                              : ' (assinatura)'}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{offerAccessSummary(o)}</div>
                  </TableCell>
                  <TableCell>
                    {o.isAvailable ? (
                      <Badge variant="success">Sim</Badge>
                    ) : (
                      <Badge variant="muted">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} kind="catalog" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(o)}
                      aria-label={`Editar ${o.name}`}
                    >
                      <Pencil className="size-4" aria-hidden /> Editar
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
        description={editing ? editing.name : 'Diga por quanto e como um produto é vendido.'}
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
        <div className="flex flex-col gap-6">
          <FormSection title="O que está à venda">
            {!editing ? (
              <Field
                label="Produto"
                htmlFor="productId"
                tooltip="O produto que esta oferta vende. O endereço e o código saem do produto, do preço e da forma de cobrança."
              >
                <Select
                  id="productId"
                  value={form.productId}
                  onChange={(e) =>
                    setForm((f) => withSuggestions({ ...f, productId: e.target.value }))
                  }
                >
                  {/* O código interno vai junto: dois produtos com o mesmo nome ficam diferentes. */}
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · código {p.sku}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field
              label="Nome"
              htmlFor="oname"
              tooltip="O título da oferta no painel e na página de vendas (ex.: 'Oferta de lançamento')."
            >
              <Input
                id="oname"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            {!editing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Endereço"
                  htmlFor="oslug"
                  tooltip="A parte final do link de pagamento (ex.: /ofertas/no-comando-da-ia-97-a-vista). Sai do produto, do preço e da forma de cobrança, e dá para trocar antes de salvar. Depois de criada, não muda."
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
                  label="Código"
                  htmlFor="code"
                  tooltip="Um código interno da oferta, usado em relatórios e integrações. Quem compra não vê. Sai sozinho e não muda depois de criada."
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
            <Field
              label="Situação"
              htmlFor="ostatus"
              tooltip="Rascunho: ainda não vende. Publicado: à venda. Pausado: a venda para por um tempo. Arquivado: encerrada de vez."
            >
              <Select
                id="ostatus"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {OFFER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s, 'catalog')}
                  </option>
                ))}
              </Select>
            </Field>
          </FormSection>

          <FormSection title="Preço e cobrança">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Preço (R$)"
                htmlFor="price"
                tooltip="O valor cobrado no pagamento. É este preço que vale."
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
                tooltip="O preço cheio, que aparece riscado ao lado do preço de verdade para mostrar o desconto."
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Forma de cobrança"
                htmlFor="pricingMode"
                tooltip="À vista: paga uma vez. Assinatura: cobra de novo no cartão a cada período."
              >
                <Select
                  id="pricingMode"
                  value={form.pricingMode}
                  onChange={(e) => changePricingMode(e.target.value as PricingMode)}
                >
                  {PRICING_MODES.map((m) => (
                    <option key={m} value={m}>
                      {PRICING_MODE_LABELS[m] ?? m}
                    </option>
                  ))}
                </Select>
              </Field>
              {form.pricingMode === 'subscription' ? (
                <Field
                  label="De quanto em quanto tempo cobra"
                  htmlFor="billingInterval"
                  tooltip="Mensal cobra todo mês, anual cobra uma vez por ano. Precisa escolher para vender assinatura."
                >
                  <Select
                    id="billingInterval"
                    value={form.billingInterval}
                    onChange={(e) => setForm((f) => ({ ...f, billingInterval: e.target.value }))}
                  >
                    <option value="">Escolha</option>
                    {BILLING_INTERVALS.map((i) => (
                      <option key={i.value} value={i.value}>
                        {i.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <Field
                  label="Até quantas parcelas (opcional)"
                  htmlFor="installments"
                  tooltip="O máximo de parcelas no cartão. Vazio usa o padrão da página de pagamento."
                >
                  <Input
                    id="installments"
                    inputMode="numeric"
                    value={form.installmentsMax}
                    onChange={(e) => setForm((f) => ({ ...f, installmentsMax: e.target.value }))}
                  />
                </Field>
              )}
            </div>
            {form.pricingMode === 'subscription' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Endereço da outra oferta (opcional)"
                  htmlFor="altOfferSlug"
                  tooltip="O endereço da oferta par para a troca entre mensal e anual na página de pagamento (ex.: a mensal aponta para a anual). Preencha nas duas ofertas, uma apontando para a outra."
                >
                  <Input
                    id="altOfferSlug"
                    placeholder="ex.: clube-anual"
                    value={form.altOfferSlug}
                    onChange={(e) => setForm((f) => ({ ...f, altOfferSlug: e.target.value }))}
                  />
                </Field>
                <Field
                  label="Texto da troca (opcional)"
                  htmlFor="altOfferLabel"
                  tooltip="O texto do botão de troca na página de pagamento (ex.: 'Economize no anual'). Vazio usa o texto padrão."
                >
                  <Input
                    id="altOfferLabel"
                    placeholder="ex.: Economize no anual"
                    value={form.altOfferLabel}
                    onChange={(e) => setForm((f) => ({ ...f, altOfferLabel: e.target.value }))}
                  />
                </Field>
              </div>
            ) : null}
          </FormSection>

          <FormSection title="Acesso e garantia">
            {form.pricingMode === 'subscription' ? (
              <Field
                label="Acesso"
                htmlFor="accessMode"
                hint="Na assinatura, o acesso dura enquanto as cobranças estiverem em dia."
              >
                <Input id="accessMode" value={ACCESS_MODE_LABELS.billing_cycle} disabled readOnly />
              </Field>
            ) : (
              <Field
                label="Acesso"
                htmlFor="accessMode"
                error={accessErrors.accessMode}
                tooltip="Vitalício não vence. O prazo fixo começa quando o pagamento é aprovado e pode ser em dias ou meses."
              >
                <Select
                  id="accessMode"
                  value={form.accessMode}
                  onChange={(e) => changeAccessMode(e.target.value as AccessMode | '')}
                >
                  <option value="">Escolha</option>
                  <option value="lifetime">Vitalício</option>
                  <option value="fixed">Prazo fixo</option>
                </Select>
              </Field>
            )}
            {form.pricingMode === 'one_time' && form.accessMode === 'fixed' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Duração do acesso"
                  htmlFor="accessDurationValue"
                  error={accessErrors.accessDurationValue}
                  hint={
                    form.status === 'active'
                      ? 'Precisa preencher para publicar.'
                      : 'Pode ficar vazia enquanto a oferta é rascunho ou está pausada.'
                  }
                >
                  <Input
                    id="accessDurationValue"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    placeholder="Ex.: 30"
                    value={form.accessDurationValue}
                    onChange={(e) => {
                      setAccessErrors((errors) => ({ ...errors, accessDurationValue: undefined }))
                      setForm((current) => ({
                        ...current,
                        accessDurationValue: e.target.value,
                      }))
                    }}
                  />
                </Field>
                <Field
                  label="Em dias ou meses"
                  htmlFor="accessDurationUnit"
                  error={accessErrors.accessDurationUnit}
                >
                  <Select
                    id="accessDurationUnit"
                    value={form.accessDurationUnit}
                    onChange={(e) => {
                      setAccessErrors((errors) => ({ ...errors, accessDurationUnit: undefined }))
                      setForm((current) => ({
                        ...current,
                        accessDurationUnit: e.target.value as AccessDurationUnit,
                      }))
                    }}
                  >
                    <option value="">Escolha</option>
                    <option value="days">Dias</option>
                    <option value="months">Meses</option>
                  </Select>
                </Field>
              </div>
            ) : null}
            <Field
              label="Garantia (dias, opcional)"
              htmlFor="guarantee"
              tooltip="Quantos dias de garantia a página de vendas promete. A nota fiscal sai quando a garantia acaba."
            >
              <Input
                id="guarantee"
                inputMode="numeric"
                value={form.guaranteeDays}
                onChange={(e) => setForm((f) => ({ ...f, guaranteeDays: e.target.value }))}
              />
            </Field>
          </FormSection>

          <FormSection title="Extras">
            <Field
              label="Perfis de criança (Comunidade dos Criadores)"
              htmlFor="maxProfiles"
              tooltip="Quantos perfis de criança esta oferta libera. O responsável cria até esse número. Deixe vazio fora da Comunidade dos Criadores. Um número de 1 a 50."
            >
              <Input
                id="maxProfiles"
                inputMode="numeric"
                placeholder="Ex.: 2 (vazio: sem limite de perfis)"
                value={form.maxProfiles}
                onChange={(e) => setForm((f) => ({ ...f, maxProfiles: e.target.value }))}
              />
            </Field>
            <Field
              label="Bônus"
              tooltip="Produtos que vêm junto com o principal, só nesta oferta (ex.: uma planilha de presente). Quem compra ganha tudo."
            >
              <OfferItemsEditor
                products={products}
                value={form.items}
                onChange={(items) => setForm((f) => ({ ...f, items }))}
                mainProductId={form.productId}
              />
            </Field>
          </FormSection>
        </div>
      </Dialog>
      {confirmDialog}
    </div>
  )
}
