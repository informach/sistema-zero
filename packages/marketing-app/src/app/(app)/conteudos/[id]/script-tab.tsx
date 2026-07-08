'use client'

import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Textarea } from '@sistemazero/ui/textarea'
import { Sparkles, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { LightCopyHints } from '@/components/ai/light-copy-hints'
import { useAiStatus } from '@/components/ai/use-ai-status'
import { OwnerSelect } from '@/components/shared/owner-select'
import { type ApiError, apiSend } from '@/lib/api'
import { dateInputToSaoPauloEndOfDayIso, isoToSaoPauloDayKey } from '@/lib/dates'
import type { AiScriptView, ContentDetailView } from '@/lib/types'
import { handleConflict } from '../shared'

/**
 * Aba Roteiro: título/briefing/roteiro/responsável/prazo, com Salvar por
 * dirty-flag e concorrência otimista (`version`). O pai monta este componente
 * com `key` = id:version — salvar/conflito remonta com os valores atuais do
 * servidor, sem efeito de sincronização.
 */
export function ScriptTab({
  detail,
  onSaved,
  reload,
}: {
  detail: ContentDetailView
  onSaved: (view: ContentDetailView) => void
  reload: () => Promise<void>
}) {
  const [title, setTitle] = useState(detail.title)
  const [brief, setBrief] = useState(detail.brief ?? '')
  const [script, setScript] = useState(detail.script ?? '')
  const [ownerUserId, setOwnerUserId] = useState(detail.ownerUserId)
  const [ownerName, setOwnerName] = useState(detail.ownerName)
  const [dueDate, setDueDate] = useState(detail.dueDate ? isoToSaoPauloDayKey(detail.dueDate) : '')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [dueError, setDueError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const aiEnabled = useAiStatus()
  const [aiBusy, setAiBusy] = useState<false | 'generate' | 'improve'>(false)
  const [aiNotes, setAiNotes] = useState<string[]>([])

  async function runAi(mode: 'generate' | 'improve') {
    setAiBusy(mode)
    setAiNotes([])
    try {
      const res = await apiSend<AiScriptView>('/api/marketing/ai/script', 'POST', {
        contentId: detail.id,
        mode,
        script: mode === 'improve' ? script : undefined,
      })
      setScript(res.script)
      setAiNotes(res.notes)
    } catch (error) {
      const apiError = error as ApiError
      toast.error(
        apiError.status === 503
          ? 'A IA não está configurada neste ambiente.'
          : apiError.status === 502
            ? 'A IA não respondeu agora. Tente de novo.'
            : apiError.message,
      )
    } finally {
      setAiBusy(false)
    }
  }

  const dirty =
    title !== detail.title ||
    brief !== (detail.brief ?? '') ||
    script !== (detail.script ?? '') ||
    ownerUserId !== detail.ownerUserId ||
    dueDate !== (detail.dueDate ? isoToSaoPauloDayKey(detail.dueDate) : '')

  async function save() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setTitleError('Dê um título ao conteúdo')
      return
    }
    setTitleError(null)
    const dueIso = dueDate ? dateInputToSaoPauloEndOfDayIso(dueDate) : null
    if (dueDate && !dueIso) {
      setDueError('Escolha uma data válida')
      return
    }
    setDueError(null)
    setSaving(true)
    try {
      const view = await apiSend<ContentDetailView>(
        `/api/marketing/contents/${detail.id}`,
        'PATCH',
        {
          title: trimmedTitle,
          brief: brief.trim() || null,
          script: script || null,
          ownerUserId,
          ownerName,
          dueDate: dueIso,
          version: detail.version,
        },
      )
      onSaved(view)
      toast.success('Conteúdo salvo.')
    } catch (error) {
      if (await handleConflict(error, reload)) return
      toast.error((error as ApiError).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <Field label="Título" htmlFor="content-title" error={titleError ?? undefined}>
          <Input
            id="content-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </Field>
        <Field
          label="Briefing"
          htmlFor="content-brief"
          hint="O resumo da ideia: ângulo, público e o que não pode faltar."
        >
          <Textarea
            id="content-brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
          />
        </Field>
        <Field label="Roteiro" htmlFor="content-script">
          <Textarea
            id="content-script"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={12}
            className="min-h-64 font-mono text-xs leading-relaxed"
            placeholder="Escreva o roteiro aqui"
          />
        </Field>
        {aiEnabled ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void runAi('generate')}
              disabled={aiBusy !== false}
            >
              <Sparkles className="size-3.5" aria-hidden />
              {aiBusy === 'generate'
                ? 'Gerando…'
                : script.trim()
                  ? 'Gerar de novo'
                  : 'Gerar roteiro'}
            </Button>
            {script.trim() ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void runAi('improve')}
                disabled={aiBusy !== false}
              >
                <Wand2 className="size-3.5" aria-hidden />
                {aiBusy === 'improve' ? 'Melhorando…' : 'Melhorar roteiro'}
              </Button>
            ) : null}
          </div>
        ) : null}
        {aiNotes.length > 0 ? (
          <p className="text-xs text-muted-foreground">A IA: {aiNotes.join(' ')}</p>
        ) : null}
        <LightCopyHints text={script} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Responsável" htmlFor="content-owner">
            <OwnerSelect
              value={ownerUserId}
              onChange={(id, name) => {
                setOwnerUserId(id)
                setOwnerName(name)
              }}
            />
          </Field>
          <Field label="Prazo" htmlFor="content-due" error={dueError ?? undefined}>
            <Input
              id="content-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex justify-end border-t border-border pt-4">
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
