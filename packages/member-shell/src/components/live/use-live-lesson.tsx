'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LiveRequestError, liveRequest } from '../../lib/live/client'
import type { LiveLessonSlotProps } from '../../lib/live/lesson-slot'
import type { LessonDetailView } from '../../lib/types'

/** As partes que a criança já concluiu (o progresso real da aula), para os cartões da professora. */
export function completedSectionIds(lesson: LessonDetailView | null): string[] {
  return (lesson?.sectionProgress?.sections ?? [])
    .filter((section) => section.status === 'completed')
    .map((section) => section.id)
}

/**
 * A aula do encontro no slot da sala (Kids e comunidade adulta, 14/10/2026). Ela vem pela rota de
 * aula de SEMPRE (`/members/courses/:slug/lessons/:id`, pelo BFF da sala), em que o members confere
 * a vaga na turma. Atualizar é RELER o JSON: na sala nunca se usa o `router.refresh()`, que num
 * build novo vira recarregamento da página e derrubaria a chamada.
 *
 * Também relata à sala a parte em que a criança está e as que ela concluiu, e entrega as partes e
 * os anexos (os controles da professora e os materiais da barra).
 */
export function useLiveLesson(slot: LiveLessonSlotProps, initial?: LessonDetailView | null) {
  const { courseSlug, lessonId } = slot.lesson
  const key = `${courseSlug}:${lessonId}`
  // A página já pode trazer a aula do servidor (o primeiro quadro com a aula, sem esqueleto).
  const [state, setState] = useState<{
    key: string
    lesson: LessonDetailView | null
    error: string | null
    /** A vaga ainda não abriu esta aula (`LIVE_LESSON_CLOSED`): espera gentil, nunca erro. */
    closed?: boolean
  } | null>(() =>
    initial && initial.id === lessonId ? { key, lesson: initial, error: null } : null,
  )
  const [version, setVersion] = useState(0)
  const fromServer = useRef(Boolean(initial && initial.id === lessonId))
  // `version` pede a releitura (o `reload`).
  useEffect(() => {
    if (fromServer.current && version === 0) {
      fromServer.current = false
      return
    }
    const controller = new AbortController()
    liveRequest<LessonDetailView>(
      `/api/live/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonId)}`,
      undefined,
      'GET',
      controller.signal,
    )
      .then((lesson) => {
        if (!controller.signal.aborted) setState({ key, lesson, error: null })
      })
      .catch((cause) => {
        if (controller.signal.aborted) return
        // ⭐ A aula de curso ao vivo só abre com a vaga da sessão, no dia marcado (403
        // `LIVE_LESSON_CLOSED`, frente curso): a sala espera e tenta de novo sozinha.
        const closed = cause instanceof LiveRequestError && cause.code === 'LIVE_LESSON_CLOSED'
        // A releitura que falha mantém a aula que já está na tela (a criança segue criando).
        setState((previous) =>
          previous?.key === key && previous.lesson
            ? previous
            : {
                key,
                lesson: null,
                closed,
                error: closed
                  ? null
                  : cause instanceof Error
                    ? cause.message
                    : 'Não foi possível abrir o encontro.',
              },
        )
      })
    return () => controller.abort()
  }, [key, courseSlug, lessonId, version])
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  const lesson = state?.key === key ? state.lesson : null
  const error = state?.key === key ? state.error : null
  const closed = state?.key === key && state.closed === true && !lesson
  // Fechada, tenta de novo a cada 15 s: a vaga abre no horário, e a criança não recarrega nada.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o gatilho é a tentativa fechada.
  useEffect(() => {
    if (!closed) return
    const timer = setTimeout(reload, 15_000)
    return () => clearTimeout(timer)
  }, [closed, version])
  const callbacks = useRef(slot)
  callbacks.current = slot
  const section = useRef<string | null>(null)
  const completed = useMemo(() => completedSectionIds(lesson), [lesson])
  const completedRef = useRef(completed)
  completedRef.current = completed
  const onSectionChange = useCallback((posicao: { sectionId: string }) => {
    section.current = posicao.sectionId || null
    callbacks.current.onSectionReport({
      sectionId: section.current,
      completedSectionIds: completedRef.current,
    })
  }, [])
  const completedKey = completed.join(',')
  // biome-ignore lint/correctness/useExhaustiveDependencies: relata quando a lista concluída muda.
  useEffect(() => {
    callbacks.current.onSectionReport({
      sectionId: section.current,
      completedSectionIds: completedRef.current,
    })
  }, [completedKey])
  useEffect(() => {
    if (!lesson) return
    callbacks.current.onOutline?.({
      sections: (lesson.sections ?? []).map((item) => ({ id: item.id, title: item.title })),
      attachments: lesson.attachments.map((item) => ({
        id: item.id,
        label: item.label,
        fileType: item.fileType,
      })),
    })
  }, [lesson])
  // O Estúdio carrega sob demanda, mas sem esperar a criança chegar à parte dele: quando a aula tem
  // um bloco Estúdio, o código do editor é baixado no tempo ocioso, DEPOIS da transmissão.
  const hasStudio = Boolean(lesson?.blocks.some((block) => block.kind === 'studio'))
  useEffect(() => {
    if (!hasStudio) return
    const start = () => {
      void import('./live-workspace').catch(() => {})
      void import('@sistemazero/studio/editor').catch(() => {})
    }
    const idle = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (idle.requestIdleCallback) {
      const id = idle.requestIdleCallback(start, { timeout: 4000 })
      return () => idle.cancelIdleCallback?.(id)
    }
    const timer = setTimeout(start, 1500)
    return () => clearTimeout(timer)
  }, [hasStudio])
  return { lesson, error, closed, reload, onSectionChange }
}

/**
 * A aula ainda fechada para a vaga (`LIVE_LESSON_CLOSED`): o mesmo formato do esqueleto, com a
 * transmissão no lugar e um recado de espera. Nada de erro: ela abre sozinha no horário.
 */
export function LiveLessonClosed({ stage }: { stage: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[860px] space-y-6">
      <div className="mx-auto w-full max-w-[max(18rem,calc((100dvh-24rem)*16/9))]">{stage}</div>
      <section
        role="status"
        className="sz-live-lesson-closed space-y-1.5 rounded-2xl border bg-card p-5 text-center"
      >
        <h2 className="sz-display text-xl">O encontro ainda vai abrir</h2>
        <p className="font-medium text-muted-foreground">
          Ele abre no dia marcado, para quem tem vaga na turma. Quando abrir, tudo aparece aqui, sem
          precisar recarregar a página.
        </p>
      </section>
    </div>
  )
}

/**
 * Enquanto a aula chega: o MESMO formato da aula de leitura (a transmissão em 16:9 no alto, com a
 * largura contida pela janela, e um cartão), para nada pular quando ela aparece.
 */
export function LiveLessonSkeleton({ stage, label }: { stage: ReactNode; label: string }) {
  return (
    <div className="mx-auto w-full max-w-[860px] space-y-6" aria-busy="true">
      <div className="mx-auto w-full max-w-[max(18rem,calc((100dvh-24rem)*16/9))]">{stage}</div>
      <p role="status" className="sr-only">
        {label}
      </p>
      <div
        aria-hidden
        className="h-28 animate-pulse rounded-2xl bg-card/70 motion-reduce:animate-none"
      />
    </div>
  )
}
