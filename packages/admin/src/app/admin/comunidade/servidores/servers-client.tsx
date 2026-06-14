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
import { CommunityTabs } from '@/components/admin/community-tabs'
import { HubAccessFields, PUBLIC_ACCESS } from '@/components/admin/hub-access-fields'
import { useSortableItem } from '@/components/dnd/use-sortable-item'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { HubAccessConfig, HubAudience, HubSpaceView } from '@/lib/hub-types'
import { slugify } from '@/lib/slug'
import type { Paginated } from '@/lib/types'

const AUDIENCES: { value: HubAudience; label: string }[] = [
  { value: 'adult', label: 'Adultos' },
  { value: 'kids', label: 'Crianças' },
]

interface SpaceForm {
  name: string
  slug: string
  audience: HubAudience
  description: string
  iconUrl: string
  accessConfig: HubAccessConfig
  requiresApproval: boolean
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
  status: 'active',
})

export function ServersClient({ currentRole }: { currentRole: string }) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'

  const [spaces, setSpaces] = useState<HubSpaceView[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<SpaceForm>(emptyForm())
  const [slugDirty, setSlugDirty] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const page = await apiGet<Paginated<HubSpaceView>>('/api/hub/admin/spaces?limit=100')
      setSpaces(page.items)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar os servidores.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function createSpace() {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Informe nome e identificador (slug).')
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
        status: form.status,
      })
      toast.success('Servidor criado.')
      setOpen(false)
      setForm(emptyForm())
      setSlugDirty(false)
      await load()
    } catch (err) {
      const e = err as ApiError
      toast.error(e.code === 'DUPLICATE_SLUG' ? 'Já existe um servidor com esse slug.' : e.message)
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
      toast.error((err as ApiError).message ?? 'Falha ao reordenar.')
      await load()
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Comunidade"
        description="Servidores e canais de fórum dos alunos (adultos e crianças)."
        action={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Novo servidor
            </Button>
          ) : null
        }
      />
      <CommunityTabs />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : spaces.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum servidor ainda. Crie o primeiro (ex.: um por curso + um “Geral”).
        </Card>
      ) : (
        AUDIENCES.map(({ value, label }) => {
          const group = spaces
            .filter((s) => s.audience === value)
            .sort((a, b) => a.sortOrder - b.sortOrder)
          if (group.length === 0) return null
          return (
            <section key={value} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{label}</h2>
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
        title="Novo servidor"
        description="Um espaço da comunidade (ex.: um curso ou um geral)."
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
          <Field label="Identificador (slug)" htmlFor="sp-slug">
            <Input
              id="sp-slug"
              value={form.slug}
              onChange={(e) => {
                setSlugDirty(true)
                setForm((f) => ({ ...f, slug: e.target.value }))
              }}
            />
          </Field>
          <Field label="Audiência" htmlFor="sp-aud">
            <Select
              id="sp-aud"
              value={form.audience}
              onChange={(e) => {
                const audience = e.target.value as HubAudience
                // Crianças nascem com pré-moderação ligada por padrão.
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
              Exigir aprovação (pré-moderação)
              <span className="block text-xs text-muted-foreground">
                Postagens passam por um staff antes de aparecer.
              </span>
            </span>
            <Switch
              checked={form.requiresApproval}
              onCheckedChange={(requiresApproval) => setForm((f) => ({ ...f, requiresApproval }))}
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
          aria-label="Reordenar"
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{space.name}</span>
          {space.status === 'archived' ? <Badge variant="muted">Arquivado</Badge> : null}
          {space.requiresApproval ? <Badge variant="muted">Pré-moderado</Badge> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          /{space.slug} · {accessLabel(space.accessConfig.visibility)}
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
  return v === 'public' ? 'Público' : v === 'course_gated' ? 'Por curso' : 'Por cargo'
}
