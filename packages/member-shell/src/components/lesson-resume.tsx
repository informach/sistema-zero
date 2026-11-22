'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { apiGet } from '../lib/api'
import type { LessonDetailView } from '../lib/types'

interface Props {
  lesson: LessonDetailView
  viewerId: string | null
  children: (current: LessonDetailView) => ReactNode
}

/** O Router Cache é um retrato da visita anterior, não a autoridade do progresso.
 * Não monte os players (nem seus autosaves) antes da leitura atual da conta. */
export function LessonResume(props: Props) {
  const [attempt, setAttempt] = useState(0)
  if (!props.viewerId) return props.children(props.lesson)
  return (
    <ResumeAccountLesson
      key={`${props.viewerId}:${props.lesson.id}:${attempt}`}
      {...props}
      viewerId={props.viewerId}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  )
}

function ResumeAccountLesson({
  lesson,
  viewerId,
  children,
  onRetry,
}: Props & { viewerId: string; onRetry: () => void }) {
  const source = useRef(lesson)
  source.current = lesson
  const [result, setResult] = useState<
    | { status: 'loading' | 'error' }
    | { status: 'ready'; source: LessonDetailView; current: LessonDetailView }
  >({ status: 'loading' })
  const { id, courseSlug } = lesson
  useEffect(() => {
    const controller = new AbortController()
    setResult({ status: 'loading' })
    void apiGet<LessonDetailView>(
      `/api/members/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(id)}`,
      { 'x-sz-viewer': viewerId },
      { signal: controller.signal },
    )
      .then((current) => {
        if (controller.signal.aborted) return
        if (
          current?.id !== id ||
          current.courseSlug !== courseSlug ||
          !Array.isArray(current.blocks)
        )
          throw new Error('A resposta não corresponde à aula.')
        // Props recebidas durante a leitura podem ser o mesmo retrato antigo, recriado
        // pelo roteador. A resposta atual vence todas elas; só um refresh posterior
        // à conclusão desta leitura pode substituir a aula de entrada.
        setResult({ status: 'ready', source: source.current, current })
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ status: 'error' })
      })
    return () => controller.abort()
  }, [id, courseSlug, viewerId])

  if (result.status === 'error')
    return (
      <div role="alert" className="mx-auto max-w-xl space-y-3 p-6">
        <p>
          Não conseguimos recuperar de onde você parou. Tente novamente para abrir a aula com seu
          progresso.
        </p>
        <button
          type="button"
          className="min-h-11 rounded-xl border px-4 font-bold"
          onClick={onRetry}
        >
          Tentar novamente
        </button>
      </div>
    )
  if (result.status !== 'ready')
    return (
      <p role="status" className="p-6 text-center">
        Recuperando seu progresso…
      </p>
    )
  // Refreshes posteriores (quiz, envio, vídeo) já vêm do servidor e continuam atualizando a
  // aula sem remontar seus editores. A leitura de entrada não congela esse retrato.
  return children(result.source === lesson ? result.current : lesson)
}
