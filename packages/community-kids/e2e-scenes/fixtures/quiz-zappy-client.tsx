import { LessonCopyProvider } from '@sistemazero/member-shell/components/lesson-copy-context'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import {
  LessonSections,
  useLessonLearning,
} from '@sistemazero/member-shell/components/lesson-sections'
import { KIDS_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy-kids'
import type { LessonDetailView } from '@sistemazero/member-shell/lib/types'
import { createRoot } from 'react-dom/client'
import manifesto from '../../../../docs/aulas-interativas/aulas/cade-todo-mundo-certificado.manifesto.json'
import { KidsLessonBlocks } from '../../src/components/kids/kids-lesson-blocks'

/**
 * A parte do quiz como a página de fase a monta (07/10/2026): uma fala do Zappy, um vídeo e o
 * quiz, pelo MESMO `KidsLessonBlocks` da página real. A pergunta do quiz é uma fala do Zappy, e o
 * Zappy dela tem de aparecer inteiro, como o da fala de cima. O quiz é o da fase do certificado
 * do Cadê, sem gabarito.
 */
type QuestaoComGabarito = Record<string, unknown> & {
  correctChoiceIds?: unknown
  explanation?: unknown
}
const conteudo = manifesto.blocks.find((block) => block.key === 'quiz-revisao-final')?.content as
  | { kind: string; questions: QuestaoComGabarito[] }
  | undefined
if (conteudo?.kind !== 'quiz') throw new Error('Quiz ausente do manifesto do certificado do Cadê')
const quiz = {
  ...conteudo,
  questions: conteudo.questions.map(({ correctChoiceIds: _c, explanation: _e, ...q }) => q),
}

const lesson = {
  id: 'aula-quiz',
  slug: 'aula-quiz',
  courseSlug: 'cade-todo-mundo',
  moduleId: 'm',
  title: 'Seu certificado',
  completed: false,
  positionSeconds: null,
  estimatedMinutes: null,
  attachments: [],
  blocks: [
    {
      id: 'fala',
      kind: 'dialogue',
      sortOrder: 0,
      blockRevision: 'r1',
      content: { kind: 'dialogue', text: 'Agora vamos relembrar essas regras com três perguntas.' },
    },
    {
      id: 'video',
      kind: 'video',
      sortOrder: 1,
      blockRevision: 'r1',
      content: { kind: 'video', provider: 'file', src: '/video.webm' },
    },
    { id: 'quiz', kind: 'quiz', sortOrder: 2, blockRevision: 'r1', content: quiz, quizState: null },
  ],
  sections: [
    {
      id: 'secao',
      title: 'Como o seu jardim funciona',
      externalTool: null,
      blockIds: ['fala', 'video', 'quiz'],
      workspaceBlockId: null,
    },
  ],
} as unknown as LessonDetailView

function Fixture() {
  const learning = useLessonLearning(lesson, 'crianca')
  return (
    <main className="kids-aula mx-auto max-w-[1400px] p-4">
      <LessonPlayerProvider
        value={{
          lessonId: lesson.id,
          courseSlug: lesson.courseSlug,
          viewerId: 'crianca',
          viewerWatermark: null,
          initialPositionSeconds: null,
          showActivityRequirement: false,
          learningProgress: learning.progress,
          onLearningProgress: learning.onProgress,
        }}
      >
        <LessonSections
          lesson={lesson}
          kids
          immersive
          lessonTitle={lesson.title}
          renderBlocks={(blocks) => <KidsLessonBlocks blocks={blocks} />}
        />
      </LessonPlayerProvider>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Raiz ausente')
createRoot(root).render(
  <LessonCopyProvider value={KIDS_LESSON_COPY}>
    <Fixture />
  </LessonCopyProvider>,
)
