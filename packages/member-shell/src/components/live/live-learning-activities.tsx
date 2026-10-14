'use client'

import {
  evaluateLearning,
  type LearningBlockProgress,
  type LessonLearningProgress,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import type { LiveControl, LiveLearningStep, LiveRoomView } from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { useEffect, useMemo, useState } from 'react'
import { apiSend } from '../../lib/api'
import { KIDS_LESSON_COPY } from '../../lib/lesson-copy-kids'
import { liveRequest } from '../../lib/live/client'
import { createLivePreviewAdapter } from '../../lib/live/preview'
import { InteractiveLessonBlock } from '../learning-activity'
import {
  type LearningExecutionAdapter,
  LearningExecutionProvider,
  LearningPresentationProvider,
} from '../learning-execution-context'
import { LessonCopyProvider } from '../lesson-copy-context'
import { type LessonPreviewContextValue, LessonPreviewProvider } from '../lesson-preview-context'

export function LiveLearningActivities({
  room,
  onControl,
  onStepChange,
  disabled,
}: {
  room: LiveRoomView
  onStepChange?(stepId: string | null): void
  onControl(command: LiveControl): Promise<boolean>
  disabled: boolean
}) {
  const steps = room.plan?.steps ?? []
  const [selected, setSelected] = useState<string | null>(null)
  const [progress, setProgress] = useState<LearningBlockProgress[] | null>(null)
  const [teacherSteps, setTeacherSteps] = useState<LiveLearningStep[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [rehearsal, setRehearsal] = useState<
    Pick<LessonPreviewContextValue, 'answers' | 'hintsUsed' | 'results'>
  >({ answers: {}, hintsUsed: {}, results: {} })
  const teacher = room.role === 'teacher'
  const sessionId = room.session.id
  const storageKey = `sz:live-step:${room.actorId}:${sessionId}`
  useEffect(() => {
    try {
      setSelected(localStorage.getItem(storageKey))
    } catch {
      /* Navigation also works without local storage. */
    }
  }, [storageKey])
  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry deliberately reloads progress or the private teacher rehearsal.
  useEffect(() => {
    const controller = new AbortController()
    const request = teacher
      ? liveRequest<{ steps: LiveLearningStep[] }>(
          `/api/live/sessions/${sessionId}/learning-preview`,
          undefined,
          'GET',
          controller.signal,
        ).then((result) => setTeacherSteps(result.steps))
      : liveRequest<LessonLearningProgress>(
          `/api/live/sessions/${sessionId}/learning-progress`,
          undefined,
          'GET',
          controller.signal,
        ).then((result) => setProgress(result.blocks))
    void request
      .then(() => setError(null))
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message)
      })
    return () => controller.abort()
  }, [sessionId, teacher, retry])
  const execution = useMemo<LearningExecutionAdapter>(
    () => ({
      context: 'live',
      viewerId: room.actorId,
      scopeId: `live:${sessionId}`,
      progress: progress ?? [],
      onProgress: (saved) =>
        setProgress((previous) => [
          ...(previous ?? []).filter((item) => item.blockId !== saved.blockId),
          saved,
        ]),
      saveProgress: (id, input) =>
        apiSend(
          `/api/live/sessions/${sessionId}/blocks/${id}/learning-progress`,
          'POST',
          input,
          undefined,
          { keepalive: true },
        ),
      attempt: (id, input) =>
        apiSend(`/api/live/sessions/${sessionId}/blocks/${id}/learning-attempts`, 'POST', input),
    }),
    [room.actorId, sessionId, progress],
  )
  const presentation = useMemo(
    () => ({ projectOriginAdapter: createLivePreviewAdapter(sessionId), keepLessonVisible: true }),
    [sessionId],
  )
  const preview = useMemo<LessonPreviewContextValue>(
    () => ({
      ...rehearsal,
      workspaces: {},
      onWorkspaceChange: () => {},
      onProjectCheck: async () => '',
      onQuiz: async () => {},
      onChange: (id, answers, hintsUsed) =>
        setRehearsal((previous) => ({
          ...previous,
          answers: { ...previous.answers, [id]: answers },
          hintsUsed: { ...previous.hintsUsed, [id]: hintsUsed },
        })),
      onAttempt: async (id, content, answers) => {
        const result = evaluateLearning(content, answers)
        setRehearsal((previous) => ({
          ...previous,
          results: { ...previous.results, [id]: result },
        }))
        return result
      },
    }),
    [rehearsal],
  )
  const currentId = (steps.find((step) => step.id === selected) ?? steps[0])?.id ?? null
  useEffect(() => {
    onStepChange?.(currentId)
  }, [onStepChange, currentId])
  if (!steps.length) return null
  const current = steps.find((step) => step.id === selected) ?? steps[0]!
  const suggestion = steps.find((step) => step.id === room.occurrence?.suggestedStepId)
  function choose(id: string) {
    setSelected(id)
    try {
      localStorage.setItem(storageKey, id)
    } catch {
      /* Optional navigation cache. */
    }
  }
  const ready = teacher ? teacherSteps !== null : progress !== null
  const blocks = teacher
    ? teacherSteps?.find((step) => step.id === current.id)?.blocks
    : current.blocks
  const body = (
    <div className="space-y-5">
      <h3 className="sz-display text-xl font-bold">{current.title}</h3>
      {current.instructions ? <p className="whitespace-pre-wrap">{current.instructions}</p> : null}
      {blocks?.map((block, index) => (
        <InteractiveLessonBlock
          key={`${block.id}:${block.revision}`}
          block={{
            id: block.id,
            blockRevision: block.revision,
            kind: 'interactive',
            sortOrder: index,
            content: teacher
              ? publicInteractiveBlock((block as LiveLearningStep['blocks'][number]).content)
              : block.content,
          }}
          previewContent={
            teacher ? (block as LiveLearningStep['blocks'][number]).content : undefined
          }
        />
      ))}
    </div>
  )
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4" aria-label="Passos da oficina">
      <h2 className="sz-display text-xl font-bold">Nosso caminho</h2>
      <nav className="flex flex-wrap gap-2" aria-label="Passos">
        {steps.map((step, index) => (
          <Button
            key={step.id}
            variant={step.id === current.id ? 'default' : 'outline'}
            className="min-h-11"
            aria-current={step.id === current.id ? 'step' : undefined}
            onClick={() => choose(step.id)}
          >
            {index + 1}. {step.title}
            {step.blocks.length > 0 &&
            step.blocks.every((block) =>
              progress?.some(
                (saved) =>
                  saved.blockId === block.id &&
                  saved.revision === block.revision &&
                  saved.result?.passed,
              ),
            )
              ? ' · Concluída'
              : ''}
          </Button>
        ))}
      </nav>
      {teacher ? (
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => void onControl({ kind: 'suggest-step', stepId: current.id })}
        >
          Indicar este passo à turma
        </Button>
      ) : suggestion && suggestion.id !== current.id ? (
        <div role="status" className="space-y-2 rounded-xl bg-primary/10 p-3">
          <p>A professora está em “{suggestion.title}”.</p>
          <Button onClick={() => choose(suggestion.id)}>Ir para esse passo</Button>
        </div>
      ) : null}
      {teacher ? (
        <p className="text-sm text-muted-foreground">
          Prévia da professora: nenhuma resposta de criança é alterada.
        </p>
      ) : null}
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
            Tentar novamente
          </Button>
        </div>
      ) : !ready ? (
        <p role="status">Preparando os desafios…</p>
      ) : (
        <LessonCopyProvider value={KIDS_LESSON_COPY}>
          <LearningPresentationProvider value={presentation}>
            {teacher ? (
              <LessonPreviewProvider value={preview}>{body}</LessonPreviewProvider>
            ) : (
              <LearningExecutionProvider value={execution}>{body}</LearningExecutionProvider>
            )}
          </LearningPresentationProvider>
        </LessonCopyProvider>
      )}
    </section>
  )
}
