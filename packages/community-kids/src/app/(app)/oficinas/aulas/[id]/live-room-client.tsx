'use client'

import { lessonCompletionRequirements } from '@sistemazero/core/learning'
import type { LiveRoomView } from '@sistemazero/core/live'
import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
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
import { Spinner } from '@sistemazero/ui/spinner'
import { CheckCircle2 } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { KidsLessonBlocks } from '@/components/kids/kids-lesson-blocks'
import { LessonActionEvidence } from '@/components/kids/lesson-action-evidence'
import { KidsMascotAnimated } from '@/components/kids/mascot-rive'
import { apiSend } from '@/lib/api'
import { conclusaoRecusada } from '@/lib/lesson-copy'
import { lessonDraftCloudFor } from '@/lib/lesson-draft-cloud'
import type { LessonCompleteResult, LessonDetailView } from '@/lib/types'
import videoGateVoice from '@/lib/zappy-video-gate-voice.json'

interface Viewer {
  viewerId: string | null
  viewerWatermark: string | null
  lessonDraftsEnabled: boolean
  voiceInput: boolean
  /** A aula lida pela página no servidor (o primeiro quadro já com a aula). */
  initialLesson?: LessonDetailView | null
}

/** A sala da criança: a sala ao vivo do member-shell com a aula do encontro no slot da aula. */
export function LiveRoomClient({
  sessionId,
  initialRoom,
  viewerId,
  viewerWatermark,
  lessonDraftsEnabled,
  voiceInput,
  initialLesson,
}: { sessionId: string; initialRoom?: LiveRoomView | null } & Viewer) {
  // Estável: a sala memoriza a aula pelo slot, e um `renderLesson` novo a refaria inteira.
  const renderLesson = useCallback(
    (slot: LiveLessonSlotProps) => (
      <KidsLiveLesson
        slot={slot}
        viewer={{ viewerId, viewerWatermark, lessonDraftsEnabled, voiceInput, initialLesson }}
      />
    ),
    [viewerId, viewerWatermark, lessonDraftsEnabled, voiceInput, initialLesson],
  )
  return (
    <LiveClassroom sessionId={sessionId} renderLesson={renderLesson} initialRoom={initialRoom} />
  )
}

/**
 * A aula do encontro com o player de aula do Kids (o mesmo contexto da página de fase): a
 * transmissão no lugar do vídeo, as partes conduzidas e o Estúdio no projeto ao vivo.
 */
function KidsLiveLesson({ slot, viewer }: { slot: LiveLessonSlotProps; viewer: Viewer }) {
  const { lesson, error, closed, reload, onSectionChange } = useLiveLesson(
    slot,
    viewer.initialLesson,
  )
  // A vaga ainda não abriu esta aula: espera gentil (abre sozinha), nunca um erro cru.
  if (closed) return <LiveLessonClosed stage={slot.stage} />
  if (error && !lesson)
    return (
      <p role="alert" className="kids-carta p-6 font-semibold">
        {error}
      </p>
    )
  if (!lesson) return <LiveLessonSkeleton stage={slot.stage} label="Abrindo a aula…" />
  return (
    <KidsLiveLessonPlayer
      key={`${viewer.viewerId}:${lesson.id}`}
      slot={slot}
      lesson={lesson}
      viewer={viewer}
      reload={reload}
      onSectionChange={onSectionChange}
    />
  )
}

function KidsLiveLessonPlayer({
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
  const { viewerId, viewerWatermark, voiceInput, lessonDraftsEnabled } = viewer
  // Junta os pedidos e espera a atividade ampliada fechar; aqui atualizar é RELER a aula.
  const refreshLesson = useLessonRefresh(reload)
  const learning = useLessonLearning(lesson, viewerId)
  const lessonDrafts = useMemo(
    () =>
      lessonDraftsEnabled && viewerId && typeof window !== 'undefined'
        ? lessonDraftCloudFor(viewerId)
        : null,
    [lessonDraftsEnabled, viewerId],
  )
  const requirements = lessonCompletionRequirements({
    ...lesson,
    learningProgress: learning.progress,
  })
  const completeBlocked = requirements.some((r) => !r.complete)
  const [completing, setCompleting] = useState(false)
  const completedRef = useRef(lesson.completed)
  // A mesma régua do gravado: XP, foguinho e missões contam pela conclusão da aula.
  const complete = useCallback(async () => {
    if (completedRef.current) return
    setCompleting(true)
    try {
      const res = await apiSend<LessonCompleteResult>(
        `/api/members/lessons/${encodeURIComponent(lesson.id)}/complete`,
        'POST',
      )
      completedRef.current = true
      const xp = res.gamification?.xpAwarded ?? 0
      toast.success(xp > 0 ? `Aula concluída! +${xp} XP` : 'Aula concluída!')
      refreshLesson()
    } catch (cause) {
      toast.error(conclusaoRecusada(cause))
    } finally {
      setCompleting(false)
    }
  }, [lesson.id, refreshLesson])
  const playerContext = useMemo<LessonPlayerContextValue>(
    () => ({
      lessonId: lesson.id,
      courseSlug: slot.lesson.courseSlug,
      showActivityRequirement: false,
      viewerWatermark,
      viewerId,
      voiceInput,
      initialPositionSeconds: lesson.positionSeconds,
      learningProgress: learning.progress,
      onLearningProgress: learning.onProgress,
      refreshAfterLearning: refreshLesson,
      refreshAfterQuiz: refreshLesson,
      refreshAfterStudio: refreshLesson,
      lessonDrafts,
      // ⭐ O bloco Estúdio é o projeto AO VIVO (com a ajuda da professora) e publica no Mural.
      liveWorkspace: slot.liveWorkspace ? { ...slot.liveWorkspace, publishToMural: true } : null,
      renderActionEvidence: (result) => <LessonActionEvidence result={result} />,
      videoGateMascot: (
        <KidsMascotAnimated expression="happy" className="size-20 sm:size-24" sound={false} />
      ),
      videoGateAudioUrl: videoGateVoice.url,
      renderInstruction: (text, pose = 'speaking', speech) => (
        <DialogueBlockView
          content={{ kind: 'dialogue', text, pose }}
          speech={speech}
          mascot={
            <KidsMascotAnimated expression={pose} className="size-16 sm:size-20" sound={false} />
          }
        />
      ),
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
      voiceInput,
      refreshLesson,
      lessonDrafts,
    ],
  )
  const completionAction = lesson.completed ? (
    <span className="inline-flex items-center gap-2 font-extrabold text-[0.9375rem]">
      <CheckCircle2 className="size-5 text-(--success-foreground)" aria-hidden />
      Aula concluída
    </span>
  ) : (
    <button
      type="button"
      onClick={() => complete()}
      disabled={completing || completeBlocked}
      className="sz-btn-gradient h-12 gap-2 px-7 text-base disabled:cursor-not-allowed disabled:opacity-55"
    >
      {completing ? <Spinner /> : <CheckCircle2 className="size-5" aria-hidden />}
      Concluir aula
    </button>
  )
  return (
    <LessonPlayerProvider value={playerContext}>
      <LessonSections
        lesson={lesson}
        kids
        lessonTitle={lesson.title}
        immersive
        stage={slot.stage}
        sectionControl={slot.sectionControl}
        completionAction={completionAction}
        completionMessage={
          completeBlocked && !lesson.completed ? 'Termine o que esta aula pede para concluir' : null
        }
        onSectionChange={onSectionChange}
        renderBlocks={(blocks) => <KidsLessonBlocks blocks={blocks} />}
      />
    </LessonPlayerProvider>
  )
}
