'use client'

import { lessonCompletionRequirements } from '@sistemazero/core/learning'
import type { LiveRoomView } from '@sistemazero/core/live'
import { LessonBlocks } from '@sistemazero/member-shell/components/lesson-blocks'
import {
  type LessonPlayerContextValue,
  LessonPlayerProvider,
} from '@sistemazero/member-shell/components/lesson-player-context'
import {
  LessonSections,
  useLessonLearning,
} from '@sistemazero/member-shell/components/lesson-sections'
import { LiveClassroom } from '@sistemazero/member-shell/components/live/live-classroom'
import {
  LiveLessonClosed,
  LiveLessonSkeleton,
  useLiveLesson,
} from '@sistemazero/member-shell/components/live/use-live-lesson'
import type { LiveLessonSlotProps } from '@sistemazero/member-shell/lib/live/lesson-slot'
import { useLessonRefresh } from '@sistemazero/member-shell/lib/use-lesson-refresh'
import { Button } from '@sistemazero/ui/button'
import { Spinner } from '@sistemazero/ui/spinner'
import { CheckCircle2 } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { lessonZappy } from '@/components/community/lesson-zappy'
import { type ApiError, apiSend } from '@/lib/api'
import type { LessonDetailView } from '@/lib/types'

interface Viewer {
  viewerId: string | null
  viewerWatermark: string | null
  /** A aula lida pela página no servidor (o primeiro quadro já com a aula). */
  initialLesson?: LessonDetailView | null
}

/** A sala da comunidade adulta: a sala do member-shell com a aula do encontro no slot. */
export function LiveRoomClient({
  sessionId,
  initialRoom,
  viewerId,
  viewerWatermark,
  initialLesson,
}: { sessionId: string; initialRoom?: LiveRoomView | null } & Viewer) {
  // Estável: a sala memoriza a aula pelo slot, e um `renderLesson` novo a refaria inteira.
  const renderLesson = useCallback(
    (slot: LiveLessonSlotProps) => (
      <AdultLiveLesson slot={slot} viewer={{ viewerId, viewerWatermark, initialLesson }} />
    ),
    [viewerId, viewerWatermark, initialLesson],
  )
  return (
    // `sz-aula-adulto`: a pele da aula adulta (o rodapé fixo, os cartões, o flutuante).
    <div className="sz-aula-adulto px-4 py-6 md:px-6">
      <LiveClassroom sessionId={sessionId} renderLesson={renderLesson} initialRoom={initialRoom} />
    </div>
  )
}

function AdultLiveLesson({ slot, viewer }: { slot: LiveLessonSlotProps; viewer: Viewer }) {
  const { lesson, error, closed, reload, onSectionChange } = useLiveLesson(
    slot,
    viewer.initialLesson,
  )
  // A vaga ainda não abriu esta aula: espera gentil (abre sozinha), nunca um erro cru.
  if (closed) return <LiveLessonClosed stage={slot.stage} />
  if (error && !lesson)
    return (
      <p role="alert" className="rounded-2xl border bg-card p-6 font-semibold">
        {error}
      </p>
    )
  if (!lesson) return <LiveLessonSkeleton stage={slot.stage} label="Abrindo o encontro…" />
  return (
    <AdultLiveLessonPlayer
      key={`${viewer.viewerId}:${lesson.id}`}
      slot={slot}
      lesson={lesson}
      viewer={viewer}
      reload={reload}
      onSectionChange={onSectionChange}
    />
  )
}

function AdultLiveLessonPlayer({
  slot,
  lesson,
  viewer,
  reload,
  onSectionChange,
}: {
  slot: LiveLessonSlotProps
  lesson: LessonDetailView
  viewer: Viewer
  reload(): void
  onSectionChange(posicao: { sectionId: string }): void
}) {
  const { viewerId, viewerWatermark } = viewer
  // Na sala atualizar é RELER a aula (nunca o `router.refresh()`, que derrubaria a chamada).
  const refreshLesson = useLessonRefresh(reload)
  const learning = useLessonLearning(lesson, viewerId)
  const requirements = lessonCompletionRequirements({
    ...lesson,
    learningProgress: learning.progress,
  })
  const completeBlocked = requirements.some((r) => !r.complete)
  const [completing, setCompleting] = useState(false)
  const completedRef = useRef(lesson.completed)
  const complete = useCallback(async () => {
    if (completedRef.current) return
    setCompleting(true)
    try {
      await apiSend(`/api/members/lessons/${encodeURIComponent(lesson.id)}/complete`, 'POST')
      completedRef.current = true
      toast.success('Encontro concluído!')
      refreshLesson()
    } catch (cause) {
      toast.error((cause as ApiError).message || 'Não foi possível concluir. Tente novamente.')
    } finally {
      setCompleting(false)
    }
  }, [lesson.id, refreshLesson])
  const playerContext = useMemo<LessonPlayerContextValue>(
    () => ({
      lessonId: lesson.id,
      dialogueMascot: lessonZappy,
      courseSlug: slot.lesson.courseSlug,
      viewerWatermark,
      viewerId,
      initialPositionSeconds: lesson.positionSeconds,
      learningProgress: learning.progress,
      onLearningProgress: learning.onProgress,
      refreshAfterLearning: refreshLesson,
      refreshAfterQuiz: refreshLesson,
      refreshAfterStudio: refreshLesson,
      // O bloco Estúdio é o projeto AO VIVO; a comunidade adulta não tem o Mural.
      liveWorkspace: slot.liveWorkspace ?? null,
    }),
    [
      lesson.id,
      lesson.positionSeconds,
      learning.progress,
      learning.onProgress,
      slot.lesson.courseSlug,
      slot.liveWorkspace,
      viewerWatermark,
      viewerId,
      refreshLesson,
    ],
  )
  const completionAction = lesson.completed ? (
    <span className="inline-flex items-center gap-2 font-semibold text-accent text-sm">
      <CheckCircle2 className="size-4" />
      Encontro concluído
    </span>
  ) : (
    <Button onClick={() => complete()} disabled={completing || completeBlocked}>
      {completing ? <Spinner /> : <CheckCircle2 className="size-4" />}
      Concluir encontro
    </Button>
  )
  return (
    <LessonPlayerProvider value={playerContext}>
      <LessonSections
        lesson={lesson}
        lessonTitle={lesson.title}
        immersive
        stage={slot.stage}
        sectionControl={slot.sectionControl}
        completionAction={completionAction}
        completionMessage={
          completeBlocked && !lesson.completed ? 'Termine as atividades para concluir' : null
        }
        onSectionChange={onSectionChange}
        renderBlocks={(blocks) => <LessonBlocks blocks={blocks} />}
      />
    </LessonPlayerProvider>
  )
}
