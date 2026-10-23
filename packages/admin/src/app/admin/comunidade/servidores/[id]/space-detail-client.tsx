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
import { Textarea } from '@sistemazero/ui/textarea'
import { ArrowLeft, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { EmptyState, LoadError } from '@/components/admin/empty-state'
import { HubAccessFields, PUBLIC_ACCESS } from '@/components/admin/hub-access-fields'
import { ReadOnlyNotice } from '@/components/admin/read-only-notice'
import { statusLabel } from '@/components/admin/status-badge'
import { useConfirm } from '@/components/admin/use-confirm'
import { useSortableItem } from '@/components/dnd/use-sortable-item'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type {
  HubAccessConfig,
  HubChannelView,
  HubPostingPolicy,
  HubSpaceTreeView,
} from '@/lib/hub-types'
import { COMMUNITY_NAMES } from '@/lib/platform'
import { slugify } from '@/lib/slug'

type ApprovalChoice = 'inherit' | 'yes' | 'no'

interface ChannelForm {
  id: string | null
  version: number | null
  name: string
  slug: string
  topic: string
  postingPolicy: HubPostingPolicy
  inheritAccess: boolean
  accessConfig: HubAccessConfig
  approval: ApprovalChoice
  status: 'active' | 'archived'
}

const emptyChannel = (): ChannelForm => ({
  id: null,
  version: null,
  name: '',
  slug: '',
  topic: '',
  postingPolicy: 'members',
  inheritAccess: true,
  accessConfig: { ...PUBLIC_ACCESS },
  approval: 'inherit',
  status: 'active',
})

export function SpaceDetailClient({
  spaceId,
  currentRole,
}: {
  spaceId: string
  currentRole: string
}) {
  const router = useRouter()
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'
  const [tree, setTree] = useState<HubSpaceTreeView | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const { confirm, confirmDialog } = useConfirm()

  const [chOpen, setChOpen] = useState(false)
  const [chForm, setChForm] = useState<ChannelForm>(emptyChannel())
  const [chSlugDirty, setChSlugDirty] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      setTree(await apiGet<HubSpaceTreeView>(`/api/hub/admin/spaces/${spaceId}`))
    } catch (err) {
      setLoadFailed(true)
      toast.error((err as ApiError).message ?? 'Não consegui carregar o espaço.')
    } finally {
      setLoading(false)
    }
  }, [spaceId])

  useEffect(() => {
    load()
  }, [load])

  async function run(fn: () => Promise<unknown>, okMsg?: string) {
    setBusy(true)
    try {
      await fn()
      if (okMsg) toast.success(okMsg)
      await load()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não deu certo. Tente de novo em instantes.')
    } finally {
      setBusy(false)
    }
  }

  function openCreateChannel() {
    setChForm(emptyChannel())
    setChSlugDirty(false)
    setChOpen(true)
  }

  function openEditChannel(c: HubChannelView) {
    setChForm({
      id: c.id,
      version: c.version,
      name: c.name,
      slug: c.slug,
      topic: c.topic ?? '',
      postingPolicy: c.postingPolicy,
      inheritAccess: c.accessConfig === null,
      accessConfig: c.accessConfig ?? { ...PUBLIC_ACCESS },
      approval: c.requiresApproval === null ? 'inherit' : c.requiresApproval ? 'yes' : 'no',
      status: c.status,
    })
    setChSlugDirty(true)
    setChOpen(true)
  }

  async function saveChannel() {
    if (!chForm.name.trim() || !chForm.slug.trim()) {
      toast.error('Preencha o nome e o endereço.')
      return
    }
    const body = {
      name: chForm.name.trim(),
      slug: chForm.slug.trim(),
      topic: chForm.topic.trim() || null,
      postingPolicy: chForm.postingPolicy,
      accessConfig: chForm.inheritAccess ? null : chForm.accessConfig,
      requiresApproval: chForm.approval === 'inherit' ? null : chForm.approval === 'yes',
      status: chForm.status,
    }
    await run(async () => {
      if (chForm.id) {
        if (chForm.version === null) {
          throw new Error('Não deu para salvar este canal. Recarregue a página e tente de novo.')
        }
        await apiSend(`/api/hub/admin/channels/${chForm.id}`, 'PATCH', {
          ...body,
          version: chForm.version,
        })
      } else {
        await apiSend(`/api/hub/admin/spaces/${spaceId}/channels`, 'POST', body)
      }
      setChOpen(false)
    }, 'Canal salvo.')
  }

  async function reorderChannels(ordered: HubChannelView[]) {
    // Renumera o `sortOrder` localmente — o render reordena por esse campo (senão
    // o canal "volta" pro lugar antigo até o próximo reload; achado do review).
    const renumbered = ordered.map((c, i) => ({ ...c, sortOrder: i }))
    setTree((prev) => (prev ? { ...prev, channels: renumbered } : prev))
    try {
      await apiSend(`/api/hub/admin/spaces/${spaceId}/channels/reorder`, 'POST', {
        orderedIds: renumbered.map((c) => c.id),
      })
    } catch (err) {
      toast.error(
        (err as ApiError).message ?? 'Não consegui mudar a ordem. A lista voltou como estava.',
      )
      await load()
    }
  }

  const back = (
    <Link
      href="/admin/comunidade/servidores"
      className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Clube e Comunidade
    </Link>
  )
  if (loading && !tree) return <EmptyState title="Carregando o espaço…" />
  if (!tree) {
    return (
      <div className="space-y-6">
        {back}
        {loadFailed ? (
          <LoadError what="o espaço" onRetry={() => void load()} />
        ) : (
          <EmptyState
            title="Este espaço não existe mais"
            description="Volte para a lista e escolha outro."
          />
        )}
      </div>
    )
  }

  const channels = [...tree.channels].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="space-y-6">
      {confirmDialog}
      {back}

      <AdminHeader
        title={tree.name}
        description={`Endereço /${tree.slug} · ${COMMUNITY_NAMES[tree.audience]} · ${
          tree.requiresApproval ? 'Aprova antes de publicar' : 'Publica direto'
        }`}
        action={
          // key={tree.version}: remonta o botão/form ao recarregar a árvore: o estado do form é
          // semeado de `tree` UMA vez, então sem isso reabriria com valores velhos e
          // re-PATCHearia stale (achado do review).
          <SpaceEditButton key={tree.version} tree={tree} canWrite={canWrite} onSaved={load} />
        }
      />

      {!canWrite ? <ReadOnlyNotice /> : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Canais</h2>
          <Button size="sm" onClick={openCreateChannel} disabled={!canWrite}>
            <Plus className="size-4" /> Novo canal
          </Button>
        </div>

        {channels.length === 0 ? (
          <EmptyState
            zappy="happy"
            title="Nenhum canal ainda"
            description="Crie os canais deste espaço, como Dúvidas e Avisos."
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e: DragEndEvent) => {
              const { active, over } = e
              if (!over || active.id === over.id) return
              const oldIdx = channels.findIndex((c) => c.id === active.id)
              const newIdx = channels.findIndex((c) => c.id === over.id)
              if (oldIdx === -1 || newIdx === -1) return
              void reorderChannels(arrayMove(channels, oldIdx, newIdx))
            }}
          >
            <SortableContext
              items={channels.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {channels.map((c) => (
                  <ChannelRow
                    key={c.id}
                    channel={c}
                    canWrite={canWrite}
                    onEdit={() => openEditChannel(c)}
                    onDelete={() =>
                      confirm({
                        title: `Excluir o canal ${c.name}?`,
                        message: (
                          <>
                            O canal <strong className="text-foreground">{c.name}</strong> e as
                            conversas dele somem, e não dá para desfazer.
                          </>
                        ),
                        confirmText: 'Excluir o canal',
                        confirmVariant: 'destructive',
                        onConfirm: () =>
                          run(
                            () => apiSend(`/api/hub/admin/channels/${c.id}`, 'DELETE'),
                            'Canal excluído.',
                          ),
                      })
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <Dialog
        open={chOpen}
        onClose={() => !busy && setChOpen(false)}
        title={chForm.id ? 'Editar canal' : 'Novo canal'}
        footer={
          <>
            <Button variant="outline" onClick={() => setChOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={saveChannel} disabled={busy}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Nome" htmlFor="ch-name">
            <Input
              id="ch-name"
              value={chForm.name}
              onChange={(e) => {
                const name = e.target.value
                setChForm((f) => ({ ...f, name, slug: chSlugDirty ? f.slug : slugify(name) }))
              }}
            />
          </Field>
          <Field
            label="Endereço"
            htmlFor="ch-slug"
            hint="Aparece no fim do link do canal. Use letras minúsculas, números e traços."
          >
            <Input
              id="ch-slug"
              value={chForm.slug}
              onChange={(e) => {
                setChSlugDirty(true)
                setChForm((f) => ({ ...f, slug: e.target.value }))
              }}
            />
          </Field>
          <Field label="Do que se fala aqui" htmlFor="ch-topic">
            <Textarea
              id="ch-topic"
              value={chForm.topic}
              onChange={(e) => setChForm((f) => ({ ...f, topic: e.target.value }))}
            />
          </Field>
          <Field label="Quem pode abrir tópicos" htmlFor="ch-posting">
            <Select
              id="ch-posting"
              value={chForm.postingPolicy}
              onChange={(e) =>
                setChForm((f) => ({ ...f, postingPolicy: e.target.value as HubPostingPolicy }))
              }
            >
              <option value="members">Todos que têm acesso</option>
              <option value="staff_only">Só a equipe (canal de avisos)</option>
            </Select>
          </Field>
          <Field label="Aprovar antes de publicar" htmlFor="ch-approval">
            <Select
              id="ch-approval"
              value={chForm.approval}
              onChange={(e) =>
                setChForm((f) => ({ ...f, approval: e.target.value as ApprovalChoice }))
              }
            >
              <option value="inherit">Igual ao espaço</option>
              <option value="yes">Sim, a equipe confere antes</option>
              <option value="no">Não, publica direto</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={chForm.inheritAccess}
              onChange={(e) => setChForm((f) => ({ ...f, inheritAccess: e.target.checked }))}
            />
            Usar o mesmo acesso do espaço
          </label>
          {!chForm.inheritAccess ? (
            <HubAccessFields
              value={chForm.accessConfig}
              onChange={(accessConfig) => setChForm((f) => ({ ...f, accessConfig }))}
            />
          ) : null}
        </div>
      </Dialog>

      {canWrite ? (
        <section className="border-t border-border pt-4">
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() =>
              confirm({
                title: `Excluir o espaço ${tree.name}?`,
                message: (
                  <>
                    O espaço <strong className="text-foreground">{tree.name}</strong>, com todos os
                    canais e as conversas dele, some de vez. Não dá para desfazer.
                  </>
                ),
                confirmText: 'Excluir espaço',
                confirmVariant: 'destructive',
                onConfirm: async () => {
                  setBusy(true)
                  try {
                    await apiSend(`/api/hub/admin/spaces/${spaceId}`, 'DELETE')
                    toast.success('Espaço excluído.')
                    router.push('/admin/comunidade/servidores')
                  } catch (err) {
                    toast.error((err as ApiError).message ?? 'Não consegui excluir o espaço.')
                    setBusy(false)
                  }
                },
              })
            }
          >
            <Trash2 className="size-4" /> Excluir espaço
          </Button>
        </section>
      ) : null}
    </div>
  )
}

function ChannelRow({
  channel,
  canWrite,
  onEdit,
  onDelete,
}: {
  channel: HubChannelView
  canWrite: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, style } = useSortableItem(channel.id)
  return (
    <Card ref={setNodeRef} style={style} className="flex items-center gap-3 p-3">
      {canWrite ? (
        <button
          type="button"
          className="cursor-grab text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label={`Mudar a ordem de ${channel.name}`}
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-bold">{channel.name}</span>
          {channel.postingPolicy === 'staff_only' ? <Badge variant="muted">Avisos</Badge> : null}
          {channel.status === 'archived' ? <Badge variant="muted">Arquivado</Badge> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          Endereço /{channel.slug}
          {channel.accessConfig ? ' · acesso próprio' : ' · mesmo acesso do espaço'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button size="sm" variant="outline" onClick={onEdit} disabled={!canWrite}>
          Editar
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} disabled={!canWrite}>
          Excluir
        </Button>
      </div>
    </Card>
  )
}

/** Botão + dialog de edição do espaço (reusa os campos do form de criação). */
function SpaceEditButton({
  tree,
  canWrite,
  onSaved,
}: {
  tree: HubSpaceTreeView
  canWrite: boolean
  onSaved: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: tree.name,
    description: tree.description ?? '',
    iconUrl: tree.iconUrl ?? '',
    accessConfig: tree.accessConfig,
    requiresApproval: tree.requiresApproval,
    teaserWhenLocked: tree.teaserWhenLocked,
    status: tree.status,
  })

  async function save() {
    setBusy(true)
    try {
      await apiSend(`/api/hub/admin/spaces/${tree.id}`, 'PATCH', {
        version: tree.version,
        slug: tree.slug,
        name: form.name.trim(),
        audience: tree.audience,
        description: form.description.trim() || null,
        iconUrl: form.iconUrl.trim() || null,
        accessConfig: form.accessConfig,
        requiresApproval: form.requiresApproval,
        teaserWhenLocked: form.teaserWhenLocked,
        status: form.status,
      })
      toast.success('Espaço atualizado.')
      setOpen(false)
      await onSaved()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui salvar o espaço.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={!canWrite}>
        <Pencil className="size-4" /> Editar espaço
      </Button>
      <Dialog
        open={open && canWrite}
        onClose={() => !busy && setOpen(false)}
        title="Editar espaço"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={busy}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Nome" htmlFor="sp-edit-name">
            <Input
              id="sp-edit-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Descrição" htmlFor="sp-edit-desc">
            <Textarea
              id="sp-edit-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <HubAccessFields
            value={form.accessConfig}
            onChange={(accessConfig) => setForm((f) => ({ ...f, accessConfig }))}
          />
          <Field label="Situação" htmlFor="sp-edit-status">
            <Select
              id="sp-edit-status"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as 'active' | 'archived' }))
              }
            >
              <option value="active">{statusLabel('active')}</option>
              <option value="archived">{statusLabel('archived')}</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.requiresApproval}
              onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))}
            />
            <span>
              Aprovar antes de publicar
              <span className="block text-xs text-muted-foreground">
                Alguém da equipe confere cada postagem antes de ela aparecer.
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.teaserWhenLocked}
              onChange={(e) => setForm((f) => ({ ...f, teaserWhenLocked: e.target.checked }))}
            />
            Mostrar trancado para quem não tem acesso
          </label>
        </div>
      </Dialog>
    </>
  )
}
