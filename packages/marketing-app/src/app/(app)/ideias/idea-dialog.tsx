'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import type { IdeaView } from '@/lib/types'
import { PotentialStarsInput } from './potential-stars'

const COMPLEXITY_OPTIONS = [
  { value: 'P', label: 'P (pequena)' },
  { value: 'M', label: 'M (média)' },
  { value: 'G', label: 'G (grande)' },
] as const

/** Criar/editar ideia. `idea` presente = edição; ausente = criação. */
export function IdeaDialog({
  open,
  idea,
  onClose,
  onSaved,
}: {
  open: boolean
  idea: IdeaView | null
  onClose: () => void
  onSaved: (saved: IdeaView, created: boolean) => void
}) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [source, setSource] = useState('')
  const [potential, setPotential] = useState<number | null>(null)
  const [complexity, setComplexity] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Reidrata os campos a cada abertura (criação limpa; edição carrega a ideia).
  useEffect(() => {
    if (!open) return
    setTitle(idea?.title ?? '')
    setNotes(idea?.notes ?? '')
    setSource(idea?.source ?? '')
    setPotential(idea?.potential ?? null)
    setComplexity(idea?.complexity ?? '')
    setTitleError(null)
  }, [open, idea])

  async function submit() {
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError('Dê um título à ideia.')
      return
    }
    if (trimmed.length > 300) {
      setTitleError('O título pode ter até 300 caracteres.')
      return
    }
    setTitleError(null)
    setSaving(true)
    // `null` explícito limpa o campo no PATCH (o backend aceita nullable).
    const body = {
      title: trimmed,
      notes: notes.trim() || null,
      source: source.trim() || null,
      potential,
      complexity: complexity || null,
    }
    try {
      const saved = idea
        ? await apiSend<IdeaView>(`/api/marketing/ideas/${idea.id}`, 'PATCH', body)
        : await apiSend<IdeaView>('/api/marketing/ideas', 'POST', body)
      toast.success(idea ? 'Ideia atualizada.' : 'Ideia criada.')
      onSaved(saved, !idea)
      onClose()
    } catch (error) {
      const apiError = error as ApiError
      toast.error(
        apiError.status === 400 || apiError.status === 409
          ? apiError.message
          : 'Não foi possível salvar a ideia. Tente novamente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={idea ? 'Editar ideia' : 'Nova ideia'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : idea ? 'Salvar' : 'Criar ideia'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título" htmlFor="idea-title" error={titleError ?? undefined}>
          <Input
            id="idea-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Qual é a ideia de conteúdo?"
            maxLength={300}
          />
        </Field>
        <Field label="Notas (opcional)" htmlFor="idea-notes">
          <Textarea
            id="idea-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contexto, referências, ângulo da abordagem…"
          />
        </Field>
        <Field label="Fonte (opcional)" htmlFor="idea-source">
          <Input
            id="idea-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="De onde veio: reunião, comentário, benchmark…"
          />
        </Field>
        <Field label="Potencial" hint="Clique de novo na mesma estrela para limpar.">
          <PotentialStarsInput value={potential} onChange={setPotential} disabled={saving} />
        </Field>
        <Field label="Complexidade" htmlFor="idea-complexity">
          <Select
            id="idea-complexity"
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
          >
            <option value="">Sem complexidade</option>
            {complexity && !COMPLEXITY_OPTIONS.some((o) => o.value === complexity) ? (
              <option value={complexity}>{complexity}</option>
            ) : null}
            {COMPLEXITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Dialog>
  )
}
