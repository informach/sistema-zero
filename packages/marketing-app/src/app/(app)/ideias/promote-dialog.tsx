'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { OwnerSelect } from '@/components/shared/owner-select'
import { type ApiError, apiSend } from '@/lib/api'
import { CONTENT_TYPE_LABELS, CONTENT_TYPES, type ContentType } from '@/lib/pipeline'
import type { IdeaView } from '@/lib/types'

/** Promove a ideia a conteúdo do pipeline (só ideias do inbox são promovíveis). */
export function PromoteDialog({
  idea,
  open,
  onClose,
  onPromoted,
  onStale,
}: {
  idea: IdeaView | null
  open: boolean
  onClose: () => void
  /** Recebe a ideia atualizada (status `accepted` + `promotedContentId`). */
  onPromoted: (updated: IdeaView) => void
  /** A ideia já saiu do inbox em outra sessão: o chamador recarrega a lista. */
  onStale: () => void
}) {
  const [contentType, setContentType] = useState<ContentType>('reels')
  const [title, setTitle] = useState('')
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setContentType('reels')
    setTitle(idea?.title ?? '')
    setOwnerUserId(null)
    setOwnerName(null)
    setTitleError(null)
  }, [open, idea])

  async function submit() {
    if (!idea) return
    const trimmed = title.trim()
    if (trimmed.length > 300) {
      setTitleError('O título pode ter até 300 caracteres.')
      return
    }
    setTitleError(null)
    setSaving(true)
    try {
      const updated = await apiSend<IdeaView>(`/api/marketing/ideas/${idea.id}/promote`, 'POST', {
        contentType,
        // Vazio deixa o backend usar o título da própria ideia.
        ...(trimmed ? { title: trimmed } : {}),
        ownerUserId,
        ownerName,
      })
      const contentId = updated.promotedContentId
      toast.success('Ideia promovida para o pipeline.', {
        action: contentId
          ? {
              label: 'Abrir conteúdo',
              onClick: () => {
                window.location.href = `/conteudos/${contentId}`
              },
            }
          : undefined,
      })
      onPromoted(updated)
      onClose()
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.code === 'IDEA_NOT_PROMOTABLE') {
        toast.error('Esta ideia já foi promovida.')
        onStale()
        onClose()
      } else {
        toast.error(
          apiError.status === 400 || apiError.status === 409
            ? apiError.message
            : 'Não foi possível promover a ideia. Tente novamente.',
        )
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Promover para o pipeline"
      description="A ideia vira um conteúdo na etapa Ideia do kanban."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Promovendo…' : 'Promover'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tipo de conteúdo" htmlFor="promote-type">
          <Select
            id="promote-type"
            value={contentType}
            onChange={(e) => {
              const next = CONTENT_TYPES.find((type) => type === e.target.value)
              if (next) setContentType(next)
            }}
          >
            {CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {CONTENT_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Título do conteúdo"
          htmlFor="promote-title"
          error={titleError ?? undefined}
          hint="Vazio usa o título da ideia."
        >
          <Input
            id="promote-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
          />
        </Field>
        <Field label="Responsável">
          <OwnerSelect
            value={ownerUserId}
            onChange={(id, name) => {
              setOwnerUserId(id)
              setOwnerName(name)
            }}
            disabled={saving}
          />
        </Field>
      </div>
    </Dialog>
  )
}
