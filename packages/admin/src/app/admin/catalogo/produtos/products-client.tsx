'use client'

import { Pencil, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { CatalogTabs } from '@/components/admin/catalog-tabs'
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
import { Textarea } from '@/components/ui/textarea'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { Paginated, ProductView } from '@/lib/types'

const LIMIT = 20
const KINDS = ['ebook', 'course', 'template_kit', 'community', 'service', 'bundle', 'other']
const PRODUCT_STATUSES = ['draft', 'active', 'archived']

interface FormState {
  sku: string
  slug: string
  name: string
  kind: string
  status: string
  description: string
  sellable: boolean
}

const EMPTY_FORM: FormState = {
  sku: '',
  slug: '',
  name: '',
  kind: 'ebook',
  status: 'draft',
  description: '',
  sellable: true,
}

export function ProductsClient() {
  const [items, setItems] = useState<ProductView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProductView | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

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
      toast.error((err as ApiError).message ?? 'Falha ao carregar produtos.')
    } finally {
      setLoading(false)
    }
  }, [offset, q, status])

  // Debounce da busca + recarga ao mudar filtros/página.
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  function openEdit(p: ProductView) {
    setEditing(p)
    setForm({
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      kind: p.kind,
      status: p.status,
      description: p.description ?? '',
      sellable: p.sellable,
    })
    setOpen(true)
  }

  async function save() {
    if (!form.name.trim() || (!editing && (!form.sku.trim() || !form.slug.trim()))) {
      toast.error('Preencha SKU, slug e nome.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiSend(`/api/catalog/products/${editing.id}`, 'PATCH', {
          name: form.name,
          kind: form.kind,
          status: form.status,
          sellable: form.sellable,
          description: form.description.trim() ? form.description : null,
        })
        toast.success('Produto atualizado.')
      } else {
        await apiSend('/api/catalog/products', 'POST', {
          sku: form.sku,
          slug: form.slug,
          name: form.name,
          kind: form.kind,
          status: form.status,
          sellable: form.sellable,
          ...(form.description.trim() ? { description: form.description } : {}),
        })
        toast.success('Produto criado.')
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
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Novo produto
          </Button>
        }
      />
      <CatalogTabs />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, slug ou SKU…"
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
          {PRODUCT_STATUSES.map((s) => (
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
              <TableHead>Nome</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
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
                  Nenhum produto encontrado.
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
                  <TableCell className="text-muted-foreground">{p.kind}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
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
        title={editing ? 'Editar produto' : 'Novo produto'}
        description={editing ? editing.name : 'Cadastre um produto no catálogo.'}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SKU" htmlFor="sku">
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                />
              </Field>
              <Field label="Slug" htmlFor="slug">
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </Field>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 text-xs text-muted-foreground">
              <div>
                SKU: <span className="font-mono">{form.sku}</span>
              </div>
              <div>
                Slug: <span className="font-mono">{form.slug}</span>
              </div>
            </div>
          )}
          <Field label="Nome" htmlFor="name">
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo" htmlFor="kind">
              <Select
                id="kind"
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="pstatus">
              <Select
                id="pstatus"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Descrição" htmlFor="desc">
            <Textarea
              id="desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.sellable}
              onChange={(e) => setForm((f) => ({ ...f, sellable: e.target.checked }))}
              className="size-4 accent-[color:var(--primary)]"
            />
            Vendável (pode ser vendido sozinho)
          </label>
        </div>
      </Dialog>
    </div>
  )
}
