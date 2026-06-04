'use client'

import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { InfoTooltip } from '@sistemazero/ui/info-tooltip'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { type ComponentDraft, ComponentsEditor } from '@/components/catalog/components-editor'
import { type CourseOption, FulfillmentEditor } from '@/components/catalog/fulfillment-editor'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { skuify, slugify } from '@/lib/slug'
import type { CourseView, FulfillmentSpec, Paginated, ProductView } from '@/lib/types'

const KINDS: { value: string; label: string }[] = [
  { value: 'ebook', label: 'Ebook' },
  { value: 'course', label: 'Curso' },
  { value: 'template_kit', label: 'Kit de templates' },
  { value: 'community', label: 'Comunidade' },
  { value: 'service', label: 'Serviço' },
  { value: 'bundle', label: 'Combo (agrupa produtos)' },
  { value: 'other', label: 'Outro' },
]
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

/** Formulário de produto (página dedicada): dados base + combo + entrega/acesso. */
export function ProductFormClient({ productId }: { productId: string | null }) {
  const router = useRouter()
  const isEdit = productId !== null

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [components, setComponents] = useState<ComponentDraft[]>([])
  const [fulfillment, setFulfillment] = useState<FulfillmentSpec | null>(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  // Auto-geração de SKU/slug a partir do nome (só na criação); edição manual
  // do campo (dirty) desliga a regeneração daquele campo.
  const [skuDirty, setSkuDirty] = useState(false)
  const [slugDirty, setSlugDirty] = useState(false)

  // Catálogo p/ o editor de combo + cursos p/ o fulfillment.
  const [products, setProducts] = useState<ProductView[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)

  useEffect(() => {
    let alive = true
    apiGet<Paginated<ProductView>>('/api/catalog/products?limit=100')
      .then((page) => {
        if (alive) setProducts(page.items)
      })
      .catch(() => {})
    apiGet<Paginated<CourseView>>('/api/members/courses?limit=100')
      .then((page) => {
        if (alive) setCourses(page.items.map((c) => ({ slug: c.slug, title: c.title })))
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setCoursesLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!productId) return
    let alive = true
    apiGet<ProductView>(`/api/catalog/products/${productId}`)
      .then((p) => {
        if (!alive) return
        setForm({
          sku: p.sku,
          slug: p.slug,
          name: p.name,
          kind: p.kind,
          status: p.status,
          description: p.description ?? '',
          sellable: p.sellable,
        })
        setComponents(
          [...p.components]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c) => ({ productId: c.productId, isPrimary: c.isPrimary })),
        )
        setFulfillment(p.fulfillment)
        setSkuDirty(true)
        setSlugDirty(true)
      })
      .catch((err) => {
        if (!alive) return
        if ((err as ApiError).status === 404) setNotFound(true)
        else toast.error((err as ApiError).message ?? 'Falha ao carregar o produto.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [productId])

  const isBundle = form.kind === 'bundle'

  async function save() {
    if (!form.name.trim() || (!isEdit && (!form.sku.trim() || !form.slug.trim()))) {
      toast.error('Preencha nome, SKU e slug.')
      return
    }
    if (fulfillment?.accessType === 'course' && !fulfillment.courseRef) {
      toast.error('Selecione o curso vinculado (ou troque o tipo de acesso).')
      return
    }
    setSaving(true)
    try {
      // PATCH substitui as coleções — envia sempre o estado completo dos editores.
      const componentsPayload = (isBundle ? components : []).map((c, i) => ({
        componentProductId: c.productId,
        sortOrder: i,
        isPrimary: c.isPrimary,
      }))
      if (isEdit) {
        await apiSend(`/api/catalog/products/${productId}`, 'PATCH', {
          name: form.name,
          kind: form.kind,
          status: form.status,
          sellable: form.sellable,
          description: form.description.trim() ? form.description : null,
          fulfillment,
          components: componentsPayload,
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
          ...(fulfillment ? { fulfillment } : {}),
          ...(componentsPayload.length ? { components: componentsPayload } : {}),
        })
        toast.success('Produto criado.')
      }
      router.push('/admin/catalogo/produtos')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível salvar.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <AdminHeader title="Produto não encontrado" />
        <Link href="/admin/catalogo/produtos" className={buttonVariants({ variant: 'outline' })}>
          <ArrowLeft className="size-4" /> Voltar aos produtos
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title={isEdit ? `Editar produto: ${form.name}` : 'Novo produto'}
        description={
          isEdit
            ? 'Dados, combo e entrega/acesso do produto.'
            : 'Digite o nome — SKU e slug são preenchidos automaticamente.'
        }
        action={
          <Link href="/admin/catalogo/produtos" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do produto</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            label="Nome"
            htmlFor="name"
            tooltip="Nome do entregável. Na criação, SKU e slug são gerados a partir dele."
          >
            <Input
              id="name"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value
                setForm((f) => ({
                  ...f,
                  name,
                  ...(!isEdit && !skuDirty ? { sku: skuify(name) } : {}),
                  ...(!isEdit && !slugDirty ? { slug: slugify(name) } : {}),
                }))
              }}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {!isEdit ? (
              <>
                <Field
                  label="SKU"
                  htmlFor="sku"
                  tooltip="Identificador único e estável do produto (minúsculas, números, hífens). Gerado do nome; edite antes de salvar se quiser outro. Não muda depois de criado."
                >
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={(e) => {
                      setSkuDirty(true)
                      setForm((f) => ({ ...f, sku: e.target.value }))
                    }}
                  />
                </Field>
                <Field
                  label="Slug"
                  htmlFor="slug"
                  tooltip="Parte do endereço público do produto (ex.: /produtos/no-comando-da-ia). Gerado do nome; edite antes de salvar se quiser outro. Não muda depois de criado."
                >
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugDirty(true)
                      setForm((f) => ({ ...f, slug: e.target.value }))
                    }}
                  />
                </Field>
              </>
            ) : (
              <div className="col-span-2 grid gap-4 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  SKU: <span className="font-mono">{form.sku}</span>
                </div>
                <div>
                  Slug: <span className="font-mono">{form.slug}</span>
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Tipo"
              htmlFor="kind"
              tooltip="O que é este item. 'Combo' agrupa vários produtos numa só compra — quem compra recebe acesso a todos."
            >
              <Select
                id="kind"
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Status"
              htmlFor="pstatus"
              tooltip="draft: em preparação. active: publicado. archived: fora de uso."
            >
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
          <Field label="Descrição" htmlFor="desc" hint="Opcional.">
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
            <InfoTooltip text="Desmarque para itens entregues apenas dentro de um combo ou como bônus de uma oferta — nunca vendidos sozinhos." />
          </label>
        </CardContent>
      </Card>

      {isBundle ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-base">
              Componentes do combo
              <InfoTooltip text="Um combo entrega vários produtos numa compra só. Adicione os produtos e marque o principal (destacado na venda)." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ComponentsEditor
              products={products}
              value={components}
              onChange={setComponents}
              selfProductId={productId ?? undefined}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            Entrega / Acesso (entitlements)
            <InfoTooltip text="É isto que a área de membros usa para liberar o acesso do comprador: tipo de acesso, curso vinculado, arquivos e quando libera." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FulfillmentEditor
            value={fulfillment}
            onChange={setFulfillment}
            courses={courses}
            coursesLoading={coursesLoading}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href="/admin/catalogo/produtos" className={buttonVariants({ variant: 'outline' })}>
          Cancelar
        </Link>
        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner /> : null}
          Salvar
        </Button>
      </div>
    </div>
  )
}
