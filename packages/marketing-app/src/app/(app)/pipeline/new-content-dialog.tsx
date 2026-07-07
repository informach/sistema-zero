'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { OwnerSelect } from '@/components/shared/owner-select'
import { type ApiError, apiSend } from '@/lib/api'
import { dateInputToSaoPauloEndOfDayIso } from '@/lib/dates'
import { CONTENT_TYPE_LABELS, CONTENT_TYPES, type ContentType } from '@/lib/pipeline'
import type { ContentDetailView } from '@/lib/types'

/** Cria um conteúdo direto na etapa Ideia do kanban. */
export function NewContentDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  /** Recebe o detalhe criado p/ o board inserir o card na coluna Ideia. */
  onCreated: (detail: ContentDetailView) => void
}) {
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<ContentType>('reels')
  const [brief, setBrief] = useState('')
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [dueDateInput, setDueDateInput] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [dueDateError, setDueDateError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setContentType('reels')
    setBrief('')
    setOwnerUserId(null)
    setOwnerName(null)
    setDueDateInput('')
    setTitleError(null)
    setDueDateError(null)
  }, [open])

  async function submit() {
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError('Dê um título ao conteúdo.')
      return
    }
    if (trimmed.length > 300) {
      setTitleError('O título pode ter até 300 caracteres.')
      return
    }
    setTitleError(null)
    let dueDate: string | null = null
    if (dueDateInput) {
      dueDate = dateInputToSaoPauloEndOfDayIso(dueDateInput)
      if (!dueDate) {
        setDueDateError('Escolha uma data válida.')
        return
      }
    }
    setDueDateError(null)
    setSaving(true)
    try {
      const detail = await apiSend<ContentDetailView>('/api/marketing/contents', 'POST', {
        title: trimmed,
        contentType,
        brief: brief.trim() || null,
        ownerUserId,
        ownerName,
        dueDate,
      })
      toast.success('Conteúdo criado na etapa Ideia.')
      onCreated(detail)
      onClose()
    } catch (error) {
      const apiError = error as ApiError
      toast.error(
        apiError.status === 400 || apiError.status === 409
          ? apiError.message
          : 'Não foi possível criar o conteúdo. Tente novamente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Novo conteúdo"
      description="O card nasce na etapa Ideia do pipeline."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Criando…' : 'Criar conteúdo'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título" htmlFor="content-title" error={titleError ?? undefined}>
          <Input
            id="content-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="O que vamos produzir?"
            maxLength={300}
          />
        </Field>
        <Field label="Tipo de conteúdo" htmlFor="content-type">
          <Select
            id="content-type"
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
        <Field label="Brief (opcional)" htmlFor="content-brief">
          <Textarea
            id="content-brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Resumo do que o conteúdo precisa cobrir…"
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
        <Field
          label="Prazo (opcional)"
          htmlFor="content-due"
          error={dueDateError ?? undefined}
          hint="Conta como fim do dia em São Paulo."
        >
          <Input
            id="content-due"
            type="date"
            value={dueDateInput}
            onChange={(e) => setDueDateInput(e.target.value)}
          />
        </Field>
      </div>
    </Dialog>
  )
}
