import { useCallback, useEffect, useRef, useState } from 'react'
import type { SelecaoStep } from '../../content/quiz-config'
import { ApiError, apiPatch, apiPost } from '../../lib/api-fetch'
import { leadAttributionFromLocation } from '../../lib/lead-attribution'
import type { QuizAnswers, QuizAnswerValue } from '../../lib/quiz-types'

/**
 * A máquina de estado comum dos quizzes em conversa (Comunidade Kids v6 e adulta, 20/10/2026): abre
 * ou retoma a sessão do lead, grava cada resposta com a revisão e o token da sessão, trata o "quiz
 * mudou" e o conflito de outra aba, e decide a próxima tela. Cada ilha só desenha; o motor do funil
 * (puro, importado pela ilha) diz quais perguntas estão ativas e quando o quiz terminou.
 */
export interface SpinEngine {
  version: string
  activeSteps: (answers: QuizAnswers) => SelecaoStep[]
  validChoice: (step: SelecaoStep, value: unknown) => boolean
  isComplete: (answers: QuizAnswers) => boolean
  /** Uma tela fora das perguntas que as respostas abrem (ex.: a saída de 18 ou mais). */
  exitCursor?: (answers: QuizAnswers) => string | null
}

interface Session {
  id: string
  answers: QuizAnswers
  sessionToken: string
}

export interface SpinQuizOptions {
  funnel: string
  basePath: string
  quizDefinitionId?: string
  /** A manchete exibida (`?manchete=`): vai na atribuição do lead para o teste A/B. */
  headline?: string
  engine: SpinEngine
}

export const INTRO = 'intro'
export const REVIEW = 'review'

export function useSpinQuiz({
  funnel,
  basePath,
  quizDefinitionId,
  headline,
  engine,
}: SpinQuizOptions) {
  const [session, setSession] = useState<Session | null>(null)
  const [cursor, setCursor] = useState(INTRO)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [updated, setUpdated] = useState(false)
  const locked = useRef(false)
  const answers = session?.answers ?? {}
  const current = answers._quiz_version === engine.version ? answers : {}
  const steps = engine.activeSteps(current)
  const complete = engine.isComplete(current)
  const firstMissing =
    steps.find((s) => !engine.validChoice(s, current[s.key]))?.key ?? steps[0]?.key
  const revision = typeof answers._quiz_revision === 'number' ? answers._quiz_revision : 0
  const resultPath = `${basePath}/resultado`

  const attribution = useCallback(
    () => ({
      ...(leadAttributionFromLocation(window.location) ?? {
        landingPath: window.location.pathname,
      }),
      ...(headline ? { quizHeadline: headline } : {}),
    }),
    [headline],
  )

  const receive = useCallback(
    (data: Session, restart = false) => {
      setSession(data)
      setError('')
      setConflict(false)
      const a = data.answers._quiz_version === engine.version ? data.answers : {}
      const hash = window.location.hash.slice(1)
      if (restart) setCursor(INTRO)
      else if (hash === 'rever') setCursor(REVIEW)
      else if (engine.activeSteps(a).some((s) => s.key === hash)) setCursor(hash)
      else setCursor(engine.exitCursor?.(a) ?? INTRO)
    },
    [engine],
  )

  const load = useCallback(
    async (restart = false) => {
      if (locked.current) return
      locked.current = true
      setBusy(true)
      setError('')
      try {
        const data = await apiPost<Session>('/api/leads', {
          funnel,
          restartQuiz: restart,
          quizDefinitionId,
          attribution: attribution(),
        })
        if (restart)
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        receive(data, restart)
      } catch (err) {
        if (err instanceof ApiError && err.code === 'QUIZ_UPDATED') setUpdated(true)
        setError('Não foi possível abrir suas respostas. Confira a conexão e tente de novo.')
      } finally {
        locked.current = false
        setBusy(false)
      }
    },
    [funnel, quizDefinitionId, attribution, receive],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: a sessão abre uma vez por funil; a atribuição é lida da URL nesse momento.
  useEffect(() => {
    let active = true
    apiPost<Session>('/api/leads', { funnel, quizDefinitionId, attribution: attribution() })
      .then((data) => {
        if (!active) return
        receive(data)
        // "Responder pensando em outra criança" no resultado chega aqui: a sessão nova nasce com
        // a definição do quiz e a manchete (o resultado não conhece nenhuma das duas).
        if (window.location.hash === '#outra-crianca') void load(true)
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === 'QUIZ_UPDATED') setUpdated(true)
        if (active) setError('Não foi possível abrir o quiz. Confira a conexão e tente de novo.')
      })
    return () => {
      active = false
    }
  }, [funnel, quizDefinitionId])

  function go(key: string) {
    setError('')
    setCursor(key)
  }

  async function save(key: string, value: QuizAnswerValue) {
    if (locked.current || !session) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      const data = await apiPatch<{ answers: QuizAnswers; complete: boolean }>('/api/leads', {
        quizDefinitionId,
        key,
        value,
        revision,
        sessionToken: session.sessionToken,
        funnel,
      })
      setSession({ ...session, answers: data.answers })
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      const exit = engine.exitCursor?.(data.answers)
      if (exit) setCursor(exit)
      else if (data.complete) window.location.assign(resultPath)
      else {
        const next = engine
          .activeSteps(data.answers)
          .find((s) => !engine.validChoice(s, data.answers[s.key]))
        setCursor(next?.key ?? REVIEW)
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'QUIZ_UPDATED') setUpdated(true)
      const stale = err instanceof ApiError && [401, 404, 409].includes(err.status)
      setConflict(stale)
      setError(
        stale
          ? 'As respostas desta sessão mudaram. Retome o que está salvo antes de continuar.'
          : 'Não conseguimos salvar esta resposta. Tente de novo.',
      )
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  return {
    session,
    current,
    steps,
    complete,
    firstMissing,
    revision,
    cursor,
    busy,
    error,
    conflict,
    updated,
    resultPath,
    go,
    save,
    load,
  }
}

/** Ordem estável dentro de um lead, inclusive ao recarregar; a ordem nunca muda a decisão. */
export function orderedOptions(step: SelecaoStep, seed: string): SelecaoStep['opcoes'] {
  if (!step.shuffle) return step.opcoes
  const movable = step.opcoes.filter((o) => !step.fixedLast?.includes(o.value))
  let hash = 2166136261
  for (const char of `${seed}:${step.key}`)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
  for (let i = movable.length - 1; i > 0; i--) {
    hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0
    const j = hash % (i + 1)
    ;[movable[i], movable[j]] = [movable[j]!, movable[i]!]
  }
  return [...movable, ...step.opcoes.filter((o) => step.fixedLast?.includes(o.value))]
}
