// A página do ensaio da vaga de arte: os componentes reais do player da aula e dos blocos de
// Pinta e de Estúdio do member-shell, com a aula vinda do members (ver `serve.ts`).
import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { LessonCopyProvider } from '@sistemazero/member-shell/components/lesson-copy-context'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import { LessonSections } from '@sistemazero/member-shell/components/lesson-sections'
import { MaterialsBlockView } from '@sistemazero/member-shell/components/materials-block'
import { PintaBlockView } from '@sistemazero/member-shell/components/pinta/pinta-block'
import { StudioBlockView } from '@sistemazero/member-shell/components/studio/studio-block'
import { KIDS_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy-kids'
import type {
  DialogueBlock,
  LessonBlockView,
  LessonDetailView,
  MaterialsBlock,
  PintaBlock,
  StudioBlock,
} from '@sistemazero/member-shell/lib/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Fixture = { slug: string; lessonId: string; viewerId: string }

function Blocks({ blocks }: { blocks: LessonBlockView[] }) {
  return blocks.map((block) => {
    const content = block.content as { kind: string }
    if (content.kind === 'dialogue')
      return <DialogueBlockView key={block.id} content={content as DialogueBlock} mascot={null} />
    if (content.kind === 'interactive')
      return <InteractiveLessonBlock key={block.id} block={block} />
    if (content.kind === 'materials')
      return (
        <MaterialsBlockView
          key={block.id}
          blockId={block.id}
          blockRevision={block.blockRevision}
          content={content as MaterialsBlock}
        />
      )
    if (content.kind === 'pinta')
      return (
        <PintaBlockView
          key={block.id}
          blockId={block.id}
          content={content as PintaBlock}
          pintaState={block.pintaState ?? null}
        />
      )
    if (content.kind === 'studio')
      return (
        <StudioBlockView
          key={block.id}
          blockId={block.id}
          content={content as StudioBlock}
          studioState={block.studioState ?? null}
        />
      )
    return null
  })
}

function Aula({ fixture }: { fixture: Fixture }) {
  const [lesson, setLesson] = useState<LessonDetailView | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const carregar = useCallback(async () => {
    const res = await fetch(
      `/api/members/courses/${encodeURIComponent(fixture.slug)}/lessons/${encodeURIComponent(fixture.lessonId)}`,
    )
    if (!res.ok) {
      setErro(`A aula não abriu: ${res.status} ${await res.text()}`)
      return
    }
    setLesson((await res.json()) as LessonDetailView)
  }, [fixture])
  useEffect(() => {
    void carregar()
  }, [carregar])
  const player = useMemo(
    () => ({
      lessonId: fixture.lessonId,
      courseSlug: fixture.slug,
      viewerId: fixture.viewerId,
      viewerWatermark: null,
      initialPositionSeconds: null,
      refreshAfterLearning: () => void carregar(),
      refreshAfterQuiz: () => void carregar(),
      refreshAfterStudio: () => void carregar(),
    }),
    [fixture, carregar],
  )
  if (erro) return <p role="alert">{erro}</p>
  if (!lesson) return <p>Abrindo a aula…</p>
  return (
    <LessonPlayerProvider value={player}>
      <LessonSections
        lesson={lesson}
        kids
        lessonTitle={lesson.title}
        renderBlocks={(blocks) => <Blocks blocks={blocks} />}
      />
    </LessonPlayerProvider>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Raiz ausente')
const fixture = (await (await fetch('/fixture.json')).json()) as Fixture
createRoot(root).render(
  <main className="kids-aula mx-auto max-w-[1400px] p-4">
    <LessonCopyProvider value={KIDS_LESSON_COPY}>
      <Aula fixture={fixture} />
    </LessonCopyProvider>
  </main>,
)
