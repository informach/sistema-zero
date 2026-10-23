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
import { statusLabel } from '@/components/admin/status-badge'
import { type ComponentDraft, ComponentsEditor } from '@/components/catalog/components-editor'
import { type CourseOption, FulfillmentEditor } from '@/components/catalog/fulfillment-editor'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { skuify, slugify } from '@/lib/slug'
import type { CourseView, FulfillmentSpec, Paginated, ProductView } from '@/lib/types'

// Tipos oferecidos no cadastro. `service`/`other` saíram do form (decisão do
// usuário, 06/2026 — "por enquanto"): o catálogo segue aceitando (enum no banco,
// default 'other'), e um produto legado com tipo fora da lista ganha uma opção
// extra na edição (não some do select).
const KINDS: { value: string; label: string }[] = [
  { value: 'ebook', label: 'E-book' },
  { value: 'course', label: 'Curso' },
  { value: 'template_kit', label: 'Kit de templates' },
  { value: 'community', label: 'Comunidade' },
  { value: 'tool', label: 'Ferramenta' },
  { value: 'bundle', label: 'Combo (agrupa produtos)' },
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

/**
 * Linhas legadas podem ter `accessType` antigo (download/external/none) e `assets`:
 * normaliza para o modelo novo (entrega só via curso/chave-mestra) — salvar o
 * produto auto-limpa o legado.
 */
function sanitizeFulfillment(spec: FulfillmentSpec | null): FulfillmentSpec | null {
  if (!spec) return null
  // ⚠️ `maxProfiles` saiu do produto (agora é da OFERTA) — não é mais preservado aqui.
  // Chaves-mestra (adulta ou kids): não levam curso vinculado.
  if (spec.accessType === 'all_courses' || spec.accessType === 'all_kids_courses') {
    return {
      accessType: spec.accessType,
      ...(spec.release ? { release: spec.release } : {}),
    }
  }
  // Comunidade: o `courseRef` guarda a CHAVE da comunidade (preservada). NÃO colapsa
  // p/ null sem a chave — a validação de ATIVAÇÃO dá a mensagem certa (rascunho fica sem).
  if (spec.accessType === 'community') {
    return {
      accessType: 'community',
      ...(spec.courseRef ? { courseRef: spec.courseRef } : {}),
      ...(spec.release ? { release: spec.release } : {}),
    }
  }
  // Sem curso e sem drip → sem entrega definida (mesma regra de colapso do editor).
  if (!spec.courseRef && (!spec.release || spec.release.mode === 'immediate')) return null
  return {
    accessType: 'course',
    ...(spec.courseRef ? { courseRef: spec.courseRef } : {}),
    ...(spec.release ? { release: spec.release } : {}),
  }
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
        setFulfillment(sanitizeFulfillment(p.fulfillment))
        setSkuDirty(true)
        setSlugDirty(true)
      })
      .catch((err) => {
        if (!alive) return
        if ((err as ApiError).status === 404) setNotFound(true)
        else toast.error((err as ApiError).message ?? 'O produto não carregou. Tente de novo.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [productId])

  const isBundle = form.kind === 'bundle'

  // Transição de tipo limpa o que não se aplica: combo não tem entrega própria
  // (a entrega vem dos componentes) e não-combo não tem componentes — espelha a
  // validação de coerência do catálogo.
  function onKindChange(kind: string) {
    setForm((f) => ({ ...f, kind }))
    if (kind === 'bundle') setFulfillment(null)
    else setComponents([])
  }

  async function save() {
    if (!form.name.trim() || (!isEdit && (!form.sku.trim() || !form.slug.trim()))) {
      toast.error('Preencha o nome, o código interno e o endereço.')
      return
    }
    // Espelha o `assertCoherent` do catálogo: rascunho é livre; ATIVAR exige o
    // produto pronto para entregar.
    if (form.status === 'active') {
      if (isBundle && components.length === 0) {
        toast.error('Para publicar um combo, coloque pelo menos um produto dentro dele.')
        return
      }
      if (!isBundle && !fulfillment) {
        toast.error('Para publicar, diga o que a pessoa ganha: um curso ou "Todos os cursos".')
        return
      }
      if (!isBundle && fulfillment?.accessType === 'course' && !fulfillment.courseRef) {
        toast.error('Escolha o curso que a pessoa ganha, ou mude para "Todos os cursos".')
        return
      }
      if (!isBundle && fulfillment?.accessType === 'community' && !fulfillment.courseRef) {
        toast.error('Escolha a comunidade que a pessoa ganha.')
        return
      }
    }
    setSaving(true)
    try {
      // PATCH substitui as coleções — envia sempre o estado completo dos editores.
      // Combo: fulfillment SEMPRE null (o domínio rejeita combo com entrega própria).
      const fulfillmentPayload = isBundle ? null : fulfillment
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
          fulfillment: fulfillmentPayload,
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
          ...(fulfillmentPayload ? { fulfillment: fulfillmentPayload } : {}),
          ...(componentsPayload.length ? { components: componentsPayload } : {}),
        })
        toast.success('Produto criado.')
      }
      router.push('/admin/catalogo/produtos')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não deu para salvar. Tente de novo.')
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
        <AdminHeader
          title="Este produto não existe"
          description="Ele pode ter sido apagado, ou o link está errado."
        />
        <Link href="/admin/catalogo/produtos" className={buttonVariants({ variant: 'outline' })}>
          <ArrowLeft className="size-4" aria-hidden /> Voltar aos produtos
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
            ? 'O que o produto é e o que a pessoa ganha ao comprar.'
            : 'Comece pelo nome. O código interno e o endereço se preenchem sozinhos.'
        }
        action={
          <Link href="/admin/catalogo/produtos" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft className="size-4" aria-hidden /> Voltar
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
            tooltip="O nome do que a pessoa ganha. Ao criar, o código interno e o endereço saem dele."
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
                  label="Código interno"
                  htmlFor="sku"
                  tooltip="Um código único que a equipe usa para achar o produto (letras minúsculas, números e hífens). Sai do nome, e dá para trocar antes de salvar. Depois de criado, não muda."
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
                  label="Endereço"
                  htmlFor="slug"
                  tooltip="A parte final do link público do produto (ex.: /produtos/no-comando-da-ia). Sai do nome, e dá para trocar antes de salvar. Depois de criado, não muda."
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
                  Código interno: <span className="font-mono">{form.sku}</span>
                </div>
                <div>
                  Endereço: <span className="font-mono">{form.slug}</span>
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Tipo"
              htmlFor="kind"
              tooltip="O que é este produto. O combo junta vários produtos numa compra só, e quem compra ganha todos."
            >
              <Select id="kind" value={form.kind} onChange={(e) => onKindChange(e.target.value)}>
                {(KINDS.some((k) => k.value === form.kind)
                  ? KINDS
                  : [...KINDS, { value: form.kind, label: `${form.kind} (tipo antigo)` }]
                ).map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Situação"
              htmlFor="pstatus"
              tooltip="Rascunho: ainda em preparação. Publicado: à venda. Arquivado: guardado, fora de uso."
            >
              <Select
                id="pstatus"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s, 'catalog')}
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
            Pode ser vendido sozinho
            <InfoTooltip text="Desmarque para o que só vem dentro de um combo ou como bônus de uma oferta, e nunca é vendido sozinho." />
          </label>
        </CardContent>
      </Card>

      {isBundle ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-base">
              O que vem no combo
              <InfoTooltip text="O combo entrega vários produtos numa compra só. Coloque os produtos e marque o principal, que aparece em destaque na venda." />
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

      {!isBundle ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-base">
              O que a pessoa ganha
              <InfoTooltip text="O que a área de membros libera para quem comprou: um curso ou todos os cursos, e quando. O combo não tem isso próprio: vale o que vem nos produtos dele." />
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
      ) : null}

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
