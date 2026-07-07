'use client'

import { Button } from '@sistemazero/ui/button'
import { Textarea } from '@sistemazero/ui/textarea'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import { formatShortSp } from '@/lib/dates'
import { STAGE_LABELS } from '@/lib/pipeline'
import type { CommentView, StageEventView } from '@/lib/types'

type TimelineEntry =
  | { kind: 'comment'; at: string; comment: CommentView }
  | { kind: 'stage'; at: string; event: StageEventView }

/**
 * Coluna lateral (desktop) / seção final (mobile): comentários da equipe
 * MESCLADOS com os eventos de etapa, do mais novo pro mais antigo.
 */
export function CommentsTimeline({
  contentId,
  comments,
  stageEvents,
  onCommentAdded,
}: {
  contentId: string
  comments: CommentView[]
  stageEvents: StageEventView[]
  onCommentAdded: (comment: CommentView) => void
}) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const entries = useMemo(() => {
    const merged: TimelineEntry[] = [
      ...comments.map((comment) => ({ kind: 'comment' as const, at: comment.createdAt, comment })),
      ...stageEvents.map((event) => ({ kind: 'stage' as const, at: event.createdAt, event })),
    ]
    // ISO-8601 compara certo como string (mais novo primeiro).
    merged.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    return merged
  }, [comments, stageEvents])

  async function submit() {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      const comment = await apiSend<CommentView>(
        `/api/marketing/contents/${contentId}/comments`,
        'POST',
        { body: trimmed },
      )
      onCommentAdded(comment)
      setBody('')
    } catch (error) {
      toast.error((error as ApiError).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <aside className="space-y-4">
      <h2 className="text-sm font-semibold">Comentários e atividade</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="space-y-2"
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Escreva um comentário para a equipe"
          aria-label="Novo comentário"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!body.trim() || sending}>
            {sending ? 'Enviando…' : 'Comentar'}
          </Button>
        </div>
      </form>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem atividade por enquanto.</p>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry) =>
            entry.kind === 'comment' ? (
              <li
                key={`comment-${entry.comment.id}`}
                className="rounded-lg border border-border bg-card p-3"
              >
                <p className="whitespace-pre-wrap break-words text-sm">{entry.comment.body}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {entry.comment.authorName ?? 'Alguém'} · {formatShortSp(entry.comment.createdAt)}
                </p>
              </li>
            ) : (
              <li key={`stage-${entry.event.id}`} className="px-1 text-xs text-muted-foreground">
                «{entry.event.actorName ?? 'Alguém'}»{' '}
                {entry.event.fromStage
                  ? `moveu de «${STAGE_LABELS[entry.event.fromStage]}» para «${STAGE_LABELS[entry.event.toStage]}»`
                  : `criou em «${STAGE_LABELS[entry.event.toStage]}»`}{' '}
                · {formatShortSp(entry.event.createdAt)}
              </li>
            ),
          )}
        </ol>
      )}
    </aside>
  )
}
