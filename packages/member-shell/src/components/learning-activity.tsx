'use client'

import {
  evaluateLearning,
  type InteractiveBlock,
  isLearningAnswers,
  isPublicInteractiveBlock,
  type LearningAnswers,
  type LearningAttemptView,
  type LearningBlockProgress,
  type PublicInteractiveBlock,
  simulationGoals,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { ArrowDown, ArrowUp, CheckCircle2, Lightbulb } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { apiSend } from '../lib/api'
import type { LessonBlockView } from '../lib/types'
import { DialogueBlockView } from './dialogue-block'
import { LearningExperiment } from './learning-experiment'
import { LearningExploration } from './learning-exploration'
import { LearningHtml } from './learning-html'
import { LearningSimulation } from './learning-simulation'
import { useLessonPlayer } from './lesson-player-context'
import { useLessonPreview } from './lesson-preview-context'

function message(error: unknown) {
  return typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : 'Não foi possível salvar. Suas respostas continuam neste navegador.'
}
export function InteractiveLessonBlock({
  block,
  previewContent,
}: {
  block: LessonBlockView
  previewContent?: InteractiveBlock
}) {
  const player = useLessonPlayer()
  if (!isPublicInteractiveBlock(block.content))
    return <p role="alert">Esta atividade precisa de uma configuração válida.</p>
  return (
    <Activity
      key={`${player?.viewerId}:${block.id}:${block.blockRevision}:${player ? '' : JSON.stringify(block.content.activity)}`}
      block={block}
      content={block.content}
      previewContent={previewContent}
    />
  )
}

function Activity({
  block,
  content,
  previewContent,
}: {
  block: LessonBlockView
  content: PublicInteractiveBlock
  previewContent?: InteractiveBlock
}) {
  const player = useLessonPlayer()
  const rehearsal = useLessonPreview()
  const saved = player?.learningProgress?.blocks.find(
    (p) => p.blockId === block.id && p.revision === block.blockRevision,
  )
  const initialSaved = useRef(saved)
  const initial = saved?.answers ?? rehearsal?.answers[block.id] ?? {}
  const [answers, setAnswers] = useState<LearningAnswers>(initial)
  const [hintsUsed, setHintsUsed] = useState(
    saved?.hintsUsed ?? rehearsal?.hintsUsed[block.id] ?? 0,
  )
  const [result, setResult] = useState(saved?.result ?? rehearsal?.results[block.id] ?? null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const id = useId()
  const key = player?.viewerId
    ? `sz:learning:${player.viewerId}:${player.lessonId}:${block.id}:${block.blockRevision}`
    : null
  const base = player
    ? `/api/members/lessons/${encodeURIComponent(player.lessonId)}/blocks/${encodeURIComponent(block.id)}`
    : null
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const current = useRef({ answers, hintsUsed, dirty: false })
  const callback = useRef(player?.onLearningProgress)
  callback.current = player?.onLearningProgress
  const requestId = useRef<string | null>(null)
  const checking = useRef(false)
  const automaticAttemptStarted = useRef(false)

  useEffect(() => {
    if (!key) return
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
      if (
        typeof raw !== 'object' ||
        raw === null ||
        !('answers' in raw) ||
        !isLearningAnswers(raw.answers) ||
        !('hintsUsed' in raw) ||
        typeof raw.hintsUsed !== 'number' ||
        !Number.isInteger(raw.hintsUsed) ||
        raw.hintsUsed < 0 ||
        raw.hintsUsed > content.hints.length ||
        !('updatedAt' in raw) ||
        typeof raw.updatedAt !== 'string'
      )
        return
      if (initialSaved.current && raw.updatedAt <= initialSaved.current.updatedAt) return
      setAnswers(raw.answers)
      setHintsUsed(raw.hintsUsed)
      current.current = { answers: raw.answers, hintsUsed: raw.hintsUsed, dirty: true }
      setStatus('Respostas recuperadas deste navegador.')
    } catch {
      /* Private browsing can disable local storage. Server persistence remains available. */
    }
  }, [key, content.hints.length])

  const persistRef = useRef<() => void>(() => {})
  persistRef.current = () => {
    if (!base || !block.blockRevision || !current.current.dirty) return
    const snapshot = {
      revision: block.blockRevision,
      answers: current.current.answers,
      hintsUsed: current.current.hintsUsed,
      positionSeconds: null,
    }
    current.current.dirty = false
    queue.current = queue.current.then(async () => {
      try {
        const response = await fetch(`${base}/learning-progress`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-sz-viewer': player?.viewerId ?? '' },
          body: JSON.stringify(snapshot),
          keepalive: true,
        })
        const data = await response.json()
        if (!response.ok) throw data?.error ?? new Error('Não foi possível salvar.')
        callback.current?.(data)
        setStatus('Respostas salvas.')
        setError('')
      } catch (e) {
        current.current.dirty = true
        setError(message(e))
        setStatus('Salvo neste navegador.')
      }
    })
  }
  useEffect(() => {
    const flush = () => {
      if (timer.current) clearTimeout(timer.current)
      persistRef.current()
    }
    const hidden = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', hidden)
      flush()
    }
  }, [])
  function change(next: LearningAnswers, nextHints = hintsUsed) {
    if ((busy && content.activity.type !== 'exploration') || !isLearningAnswers(next)) return
    requestId.current = null
    setAnswers(next)
    setHintsUsed(nextHints)
    setError('')
    setStatus(base ? 'Salvando…' : 'Prévia de autoria. Nenhum progresso de aluno foi registrado.')
    current.current = { answers: next, hintsUsed: nextHints, dirty: true }
    if (!player) rehearsal?.onChange(block.id, next, nextHints)
    if (key)
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            answers: next,
            hintsUsed: nextHints,
            updatedAt: new Date().toISOString(),
          }),
        )
      } catch {
        /* Server save still runs. */
      }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => persistRef.current(), 500)
  }
  async function check() {
    if (!player && previewContent) {
      if (checking.current) return
      checking.current = true
      setBusy(true)
      setError('')
      try {
        setResult(
          rehearsal
            ? await rehearsal.onAttempt(block.id, previewContent, current.current.answers)
            : evaluateLearning(previewContent, current.current.answers),
        )
        setStatus('Prévia de autoria. Nenhum progresso de aluno foi registrado.')
      } catch (e) {
        setError(message(e))
      } finally {
        checking.current = false
        setBusy(false)
      }
      return
    }
    if (!base || !block.blockRevision || checking.current) return
    checking.current = true
    setBusy(true)
    setError('')
    if (timer.current) clearTimeout(timer.current)
    persistRef.current()
    await queue.current
    requestId.current ??= crypto.randomUUID()
    const submitted = current.current
    try {
      const data = await apiSend<{ attempt: LearningAttemptView; progress: LearningBlockProgress }>(
        `${base}/learning-attempts`,
        'POST',
        {
          id: requestId.current,
          revision: block.blockRevision,
          answers: submitted.answers,
          hintsUsed: submitted.hintsUsed,
        },
        { 'x-sz-viewer': player?.viewerId ?? '' },
      )
      setResult(data.attempt.result)
      callback.current?.(data.progress)
      setStatus('Atividade salva.')
      player?.refreshAfterLearning?.()
      if (key && current.current.answers === submitted.answers)
        try {
          localStorage.removeItem(key)
        } catch {
          /* Storage failure must not hide a server acknowledgement. */
        }
    } catch (e) {
      setError(message(e))
    } finally {
      checking.current = false
      setBusy(false)
    }
  }
  const a = content.activity
  const order = Array.isArray(answers.order)
    ? answers.order
    : a.type === 'sequence'
      ? a.items.map((item) => item.id)
      : []
  const set = (value: LearningAnswers) => change(value)
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="space-y-5 rounded-2xl border border-primary/20 bg-card p-5 sm:p-7"
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {content.required ? 'Atividade essencial' : 'Explore esta ideia'}
        </p>
        <h3 id={`${id}-title`} className="font-semibold text-xl">
          {content.title}
        </h3>
        {player?.renderInstruction ? (
          player.renderInstruction(content.instructions)
        ) : a.type === 'simulation' || a.type === 'exploration' ? (
          <DialogueBlockView content={{ kind: 'dialogue', text: content.instructions }} />
        ) : (
          <p className="max-w-prose leading-relaxed text-muted-foreground">
            {content.instructions}
          </p>
        )}
      </div>
      <fieldset disabled={busy && a.type !== 'exploration'} className="space-y-5">
        {a.type === 'exploration' && (
          <LearningExploration
            activity={a}
            answers={answers}
            hints={content.hints}
            onChange={(next, hints) => change(next, hints)}
            onEvidence={() => {
              if (!result?.passed && !checking.current && !automaticAttemptStarted.current) {
                automaticAttemptStarted.current = true
                void check()
              }
            }}
          />
        )}
        {a.type === 'simulation' && (
          <LearningSimulation
            activity={a}
            answers={answers}
            onChange={set}
            onTrial={(next) => {
              change(next)
              if (
                !content.checkpoint &&
                !result?.passed &&
                simulationGoals(a, next).every((goal) => goal.complete)
              )
                void check()
            }}
          />
        )}
        {a.type === 'prediction' && (
          <div className="space-y-4">
            <fieldset disabled={busy} className="grid gap-2">
              <legend className="sr-only">Sua previsão</legend>
              {a.choices.map((choice) => (
                <label
                  key={choice.id}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border p-3 has-checked:border-primary has-checked:bg-primary/5"
                >
                  <input
                    type="radio"
                    name={`${id}-prediction`}
                    value={choice.id}
                    checked={answers.prediction === choice.id}
                    onChange={() => set({ ...answers, prediction: choice.id, observed: false })}
                    className="accent-primary"
                  />
                  {choice.label}
                </label>
              ))}
            </fieldset>
            <Button
              variant="outline"
              disabled={typeof answers.prediction !== 'string' || busy}
              onClick={() => set({ ...answers, observed: true })}
            >
              Observar o resultado
            </Button>
            {answers.observed === true && (
              <p className="rounded-xl bg-primary/5 p-4 leading-relaxed">{a.outcome}</p>
            )}
          </div>
        )}
        {a.type === 'comparison' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(['left', 'right'] as const).map((side) => (
              <figure key={side} className="space-y-3">
                <img
                  src={a[side].url}
                  alt={a[side].alt}
                  className="aspect-video w-full rounded-xl border border-border object-contain"
                />
                <figcaption className="font-medium">{a[side].label}</figcaption>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => set({ ...answers, [`${side}Observed`]: true })}
                >
                  {answers[`${side}Observed`] === true ? 'Observado ✓' : 'Observei este lado'}
                </Button>
              </figure>
            ))}
          </div>
        )}
        {a.type === 'sequence' && (
          <ol className="space-y-2">
            {order.map((itemId, index) => {
              const item = a.items.find((candidate) => candidate.id === itemId)
              return (
                <li
                  key={a.mode === 'match' ? a.targets[index] : itemId}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-muted/20 p-3"
                >
                  <span className="text-sm tabular-nums text-muted-foreground">{index + 1}</span>
                  {a.mode === 'match' ? (
                    <label className="flex flex-1 flex-wrap items-center justify-between gap-3">
                      {a.targets[index]}
                      <select
                        className="min-h-11 rounded-lg border border-border bg-card p-2"
                        value={itemId}
                        disabled={busy}
                        onChange={(e) => {
                          const next = [...order]
                          const other = next.indexOf(e.target.value)
                          next[index] = e.target.value
                          if (other >= 0) next[other] = itemId
                          set({ ...answers, order: next })
                        }}
                      >
                        {a.items.map((choice) => (
                          <option key={choice.id} value={choice.id}>
                            {choice.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <>
                      <span className="flex-1">{item?.label}</span>
                      {[-1, 1].map((direction) => (
                        <Button
                          key={direction}
                          variant="ghost"
                          size="icon"
                          disabled={
                            busy || index + direction < 0 || index + direction >= order.length
                          }
                          aria-label={`Mover ${item?.label} para ${direction < 0 ? 'cima' : 'baixo'}`}
                          onClick={() => {
                            const next = [...order]
                            const target = next[index + direction]
                            if (target === undefined) return
                            next[index] = target
                            next[index + direction] = itemId
                            set({ ...answers, order: next })
                          }}
                        >
                          {direction < 0 ? (
                            <ArrowUp className="size-4" />
                          ) : (
                            <ArrowDown className="size-4" />
                          )}
                        </Button>
                      ))}
                    </>
                  )}
                </li>
              )
            })}
          </ol>
        )}
        {a.type === 'experiment' && (
          <LearningExperiment activity={a} answers={answers} onChange={set} />
        )}
        {a.type === 'html' && (
          <LearningHtml html={a.html} title={content.title} answers={answers} onChange={set} />
        )}
        {content.checkpoint && (
          <fieldset disabled={busy} className="space-y-2 border-t border-border pt-5">
            <legend className="mb-3 font-medium">{content.checkpoint.prompt}</legend>
            {content.checkpoint.choices.map((choice) => (
              <label
                key={choice.id}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border p-3 has-checked:border-primary has-checked:bg-primary/5"
              >
                <input
                  type="radio"
                  name={`${id}-checkpoint`}
                  value={choice.id}
                  checked={answers.checkpoint === choice.id}
                  onChange={() => set({ ...answers, checkpoint: choice.id })}
                  className="accent-primary"
                />
                {choice.label}
              </label>
            ))}
          </fieldset>
        )}
        {a.type !== 'exploration' &&
          content.hints.slice(0, hintsUsed).map((hint) => (
            <div key={hint}>
              {player?.renderInstruction ? (
                player.renderInstruction(hint, 'thinking')
              ) : (
                <p className="rounded-xl bg-muted/50 p-4 text-sm leading-relaxed">
                  <Lightbulb className="mr-2 inline size-4 text-primary" />
                  {hint}
                </p>
              )}
            </div>
          ))}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {a.type !== 'exploration' && (
            <Button
              variant="ghost"
              disabled={busy || hintsUsed >= content.hints.length}
              onClick={() => change(answers, hintsUsed + 1)}
            >
              <Lightbulb className="size-4" />
              {hintsUsed ? 'Outra pista' : 'Quero uma pista'}
            </Button>
          )}
          <Button
            disabled={busy || (!base && !previewContent)}
            onClick={() => {
              if (a.type === 'sequence' && !Array.isArray(answers.order))
                change({ ...answers, order })
              void check()
            }}
          >
            {busy
              ? 'Salvando…'
              : a.type === 'simulation' || a.type === 'exploration'
                ? 'Salvar minha exploração'
                : 'Conferir minha descoberta'}
          </Button>
        </div>
        {result && (a.type !== 'exploration' || !result.passed) && (
          <div role="status" className="rounded-xl bg-primary/5 p-4 leading-relaxed">
            {result.passed && <CheckCircle2 className="mr-2 inline size-5 text-primary" />}
            {player?.renderInstruction
              ? player.renderInstruction(
                  result.feedback,
                  result.passed ? 'celebrating' : 'thinking',
                )
              : result.feedback}
          </div>
        )}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}{' '}
            <button
              type="button"
              className="underline"
              onClick={() => (a.type === 'exploration' ? void check() : persistRef.current())}
            >
              Tentar salvar novamente
            </button>
          </p>
        ) : (
          <p role="status" className="min-h-5 text-xs text-muted-foreground">
            {status}
          </p>
        )}
      </fieldset>
    </section>
  )
}
