'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Switch } from '@sistemazero/ui/switch'
import { Textarea } from '@sistemazero/ui/textarea'
import { GripVertical, Plus, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { EmptyState, LoadError } from '@/components/admin/empty-state'
import { HubAccessFields, PUBLIC_ACCESS } from '@/components/admin/hub-access-fields'
import { ReadOnlyNotice } from '@/components/admin/read-only-notice'
import { useSortableItem } from '@/components/dnd/use-sortable-item'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { HubAccessConfig, HubAudience, HubSpaceView } from '@/lib/hub-types'
import { COMMUNITY_NAMES } from '@/lib/platform'
import { slugify } from '@/lib/slug'
import type { Paginated } from '@/lib/types'

/** Os grupos da tela, com o nome de cada comunidade (a dos Criadores primeiro). */
const AUDIENCES: { value: HubAudience; label: string; who: string }[] = [
  { value: 'kids', label: COMMUNITY_NAMES.kids, who: 'crianças' },
  { value: 'adult', label: COMMUNITY_NAMES.adult, who: 'alunos' },
]

interface SpaceForm {
  name: string
  slug: string
  audience: HubAudience
  description: string
  iconUrl: string
  accessConfig: HubAccessConfig
  requiresApproval: boolean
  teaserWhenLocked: boolean
  status: 'active' | 'archived'
}

const emptyForm = (): SpaceForm => ({
  name: '',
  slug: '',
  audience: 'adult',
  description: '',
  iconUrl: '',
  accessConfig: { ...PUBLIC_ACCESS },
  requiresApproval: false,
  teaserWhenLocked: false,
  status: 'active',
})

export function ServersClient({ currentRole }: { currentRole: string }) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'

  const [spaces, setSpaces] = useState<HubSpaceView[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<SpaceForm>(emptyForm())
  const [slugDirty, setSlugDirty] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const page = await apiGet<Paginated<HubSpaceView>>('/api/hub/admin/spaces?limit=100')
      setSpaces(page.items)
    } catch (err) {
      setLoadFailed(true)
      toast.error((err as ApiError).message ?? 'Não consegui carregar os espaços.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function createSpace() {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Preencha o nome e o endereço.')
      return
    }
    setBusy(true)
    try {
      await apiSend('/api/hub/admin/spaces', 'POST', {
        name: form.name.trim(),
        slug: form.slug.trim(),
        audience: form.audience,
        description: form.description.trim() || null,
        iconUrl: form.iconUrl.trim() || null,
        accessConfig: form.accessConfig,
        requiresApproval: form.requiresApproval,
        teaserWhenLocked: form.teaserWhenLocked,
        status: form.status,
      })
      toast.success('Espaço criado.')
      setOpen(false)
      setForm(emptyForm())
      setSlugDirty(false)
      await load()
    } catch (err) {
      const e = err as ApiError
      toast.error(
        e.code === 'DUPLICATE_SLUG'
          ? 'Já existe um espaço com esse endereço. Escolha outro.'
          : e.message,
      )
    } finally {
      setBusy(false)
    }
  }

  async function reorder(audience: HubAudience, ordered: HubSpaceView[]) {
    // Otimista: aplica a nova ordem desse grupo no estado e persiste. Renumera o
    // `sortOrder` localmente — o render reordena por esse campo, então sem isso a
    // linha "voltaria" pro lugar antigo até o próximo reload (achado do review).
    const renumbered = ordered.map((s, i) => ({ ...s, sortOrder: i }))
    setSpaces((prev) => {
      const others = prev.filter((s) => s.audience !== audience)
      return [...others, ...renumbered]
    })
    try {
      await apiSend('/api/hub/admin/spaces/reorder', 'POST', {
        audience,
        orderedIds: renumbered.map((s) => s.id),
      })
    } catch (err) {
      toast.error(
        (err as ApiError).message ?? 'Não consegui mudar a ordem. A lista voltou como estava.',
      )
      await load()
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Clube e Comunidade"
        description="Os espaços onde as crianças e os alunos conversam, como o Clube dos Criadores, e os canais de cada um."
        action={
          <Button onClick={() => setOpen(true)} disabled={!canWrite}>
            <Plus className="size-4" /> Novo espaço
          </Button>
        }
      />

      {!canWrite ? <ReadOnlyNotice /> : null}

      {loading ? (
        <EmptyState title="Carregando os espaços…" />
      ) : loadFailed && spaces.length === 0 ? (
        <LoadError what="os espaços" onRetry={() => void load()} />
      ) : spaces.length === 0 ? (
        <EmptyState
          zappy="happy"
          title="Nenhum espaço ainda"
          description="Crie o primeiro: um por curso e um geral costuma funcionar bem."
          action={
            canWrite ? (
              <Button onClick={() => setOpen(true)}>
                <Plus className="size-4" /> Novo espaço
              </Button>
            ) : null
          }
        />
      ) : (
        AUDIENCES.map(({ value, label, who }) => {
          const group = spaces
            .filter((s) => s.audience === value)
            .sort((a, b) => a.sortOrder - b.sortOrder)
          return (
            <section key={value} className="space-y-2">
              <h2 className="font-display text-xl font-bold">{label}</h2>
              {group.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum espaço para {who} ainda.</p>
              ) : null}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e: DragEndEvent) => {
                  const { active, over } = e
                  if (!over || active.id === over.id) return
                  const oldIdx = group.findIndex((s) => s.id === active.id)
                  const newIdx = group.findIndex((s) => s.id === over.id)
                  if (oldIdx === -1 || newIdx === -1) return
                  void reorder(value, arrayMove(group, oldIdx, newIdx))
                }}
              >
                <SortableContext
                  items={group.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {group.map((space) => (
                      <SpaceRow key={space.id} space={space} canWrite={canWrite} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )
        })
      )}

      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Novo espaço"
        description="Um lugar para conversar, como um curso ou um espaço geral."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={createSpace} disabled={busy}>
              Criar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Explicador do modelo de acesso: "fechadura e chave", e cada espaço é independente. */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-muted-foreground text-xs leading-relaxed">
            <p className="font-medium text-foreground">Como o acesso funciona</p>
            <p className="mt-1">
              Cada espaço é uma porta com UMA fechadura: o campo <strong>"Quem vê"</strong>. Só ele
              decide quem entra.
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
              <li>
                <strong>Público</strong>: qualquer pessoa com conta ativa.
              </li>
              <li>
                <strong>Por comunidade</strong>: só quem tem a "chave". Você cria um produto no
                catálogo que entrega essa mesma chave, e quem compra o produto ganha a chave. É
                assim que um espaço passa a ser vendido, como o Clube dos Criadores.
              </li>
              <li>
                <strong>Por curso</strong>: quem tem matrícula no curso. <strong>Por papel</strong>:
                quem tem aquele papel na plataforma.
              </li>
            </ul>
            <p className="mt-1.5">
              Cada espaço é <strong>independente</strong> e pode ter a sua regra. Os{' '}
              <strong>canais herdam</strong> a fechadura do espaço: só mude a de um canal se quiser
              que ele seja MAIS fechado. <strong>Aprovar antes de publicar</strong> é moderação e
              não mexe no acesso. <strong>Mostrar trancado</strong> muda só o que aparece para quem
              não tem acesso.
            </p>
          </div>
          <Field label="Nome" htmlFor="sp-name">
            <Input
              id="sp-name"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value
                setForm((f) => ({ ...f, name, slug: slugDirty ? f.slug : slugify(name) }))
              }}
            />
          </Field>
          <Field
            label="Endereço"
            htmlFor="sp-slug"
            hint="Aparece no fim do link do espaço. Use letras minúsculas, números e traços."
          >
            <Input
              id="sp-slug"
              value={form.slug}
              onChange={(e) => {
                setSlugDirty(true)
                setForm((f) => ({ ...f, slug: e.target.value }))
              }}
            />
          </Field>
          <Field label="Comunidade" htmlFor="sp-aud">
            <Select
              id="sp-aud"
              value={form.audience}
              onChange={(e) => {
                const audience = e.target.value as HubAudience
                // Espaço de crianças nasce com "Aprovar antes de publicar" ligado.
                setForm((f) => ({ ...f, audience, requiresApproval: audience === 'kids' }))
              }}
            >
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descrição" htmlFor="sp-desc">
            <Textarea
              id="sp-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <HubAccessFields
            value={form.accessConfig}
            onChange={(accessConfig) => setForm((f) => ({ ...f, accessConfig }))}
          />
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Aprovar antes de publicar
              <span className="block text-xs text-muted-foreground">
                Alguém da equipe confere cada postagem antes de ela aparecer.
              </span>
            </span>
            <Switch
              checked={form.requiresApproval}
              onCheckedChange={(requiresApproval) => setForm((f) => ({ ...f, requiresApproval }))}
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Mostrar trancado para quem não tem acesso
              <span className="block text-xs text-muted-foreground">
                Quem não tem acesso vê o espaço com um cadeado e um recado, em vez de ele sumir.
              </span>
            </span>
            <Switch
              checked={form.teaserWhenLocked}
              onCheckedChange={(teaserWhenLocked) => setForm((f) => ({ ...f, teaserWhenLocked }))}
            />
          </label>
        </div>
      </Dialog>
    </div>
  )
}

function SpaceRow({ space, canWrite }: { space: HubSpaceView; canWrite: boolean }) {
  const { attributes, listeners, setNodeRef, style } = useSortableItem(space.id)
  return (
    <Card ref={setNodeRef} style={style} className="flex items-center gap-3 p-3">
      {canWrite ? (
        <button
          type="button"
          className="cursor-grab text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label={`Mudar a ordem de ${space.name}`}
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-full bg-muted font-bold text-muted-foreground"
      >
        {space.name.trim().charAt(0).toUpperCase() || '?'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-bold">{space.name}</span>
          {space.status === 'archived' ? <Badge variant="muted">Arquivado</Badge> : null}
          {space.requiresApproval ? <Badge variant="warning">Aprova antes</Badge> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          Endereço /{space.slug} · {accessLabel(space.accessConfig.visibility)}
        </p>
      </div>
      <Link
        href={`/admin/comunidade/servidores/${space.id}`}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted/60"
      >
        <Settings2 className="size-4" /> Configurar
      </Link>
    </Card>
  )
}

function accessLabel(v: string): string {
  if (v === 'public') return 'Público'
  if (v === 'course_gated') return 'Por curso'
  if (v === 'community_gated') return 'Por comunidade'
  return 'Por papel'
}
