import { isInteractiveBlock, publicInteractiveBlock } from '@sistemazero/core/learning'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import {
  LessonSections,
  useLessonLearning,
} from '@sistemazero/member-shell/components/lesson-sections'
import { LessonVideo } from '@sistemazero/member-shell/components/lesson-video'
import type { LessonDetailView, VideoBlock } from '@sistemazero/member-shell/lib/types'
import { createRoot } from 'react-dom/client'
import manifesto from '../../../../docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.manifesto.json'

/**
 * A aula de verdade (`LessonSections` com player) com um vídeo nativo curto à esquerda e o jogo
 * pronto do Cadê Todo Mundo? à direita: o ensaio do "assistir ao vídeo antes da atividade" e do
 * vídeo flutuante (03/10/2026). O servidor do ensaio devolve o progresso que recebe.
 */
const source = manifesto.blocks.find((block) => block.key === 'jogo-pronto')
if (!source || !isInteractiveBlock(source.content))
  throw new Error('Jogo pronto ausente do manifesto')

const lesson: LessonDetailView = {
  id: 'aula-video',
  slug: 'aula-video',
  courseSlug: 'cade-todo-mundo',
  moduleId: 'm',
  title: 'Cadê Todo Mundo?',
  completed: false,
  positionSeconds: null,
  estimatedMinutes: null,
  attachments: [],
  videoBeforeActivity: new URLSearchParams(location.search).has('gate'),
  blocks: [
    {
      id: 'video',
      kind: 'video',
      sortOrder: 0,
      blockRevision: 'r1',
      content: { kind: 'video', provider: 'file', src: '/video.webm' },
    },
    {
      id: 'jogo',
      kind: 'interactive',
      sortOrder: 1,
      blockRevision: 'r1',
      content: publicInteractiveBlock(source.content),
    },
  ],
  sections: [
    {
      id: 'secao',
      title: 'Procure os amigos',
      externalTool: null,
      blockIds: ['video', 'jogo'],
      workspaceBlockId: null,
    },
  ],
}

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
          videoGateMascot: (
            <span aria-hidden className="text-6xl">
              🐲
            </span>
          ),
        }}
      >
        <LessonSections
          lesson={lesson}
          kids
          // Como a página de aula: rodapé fixo (o "Pronto!" mora acima dele) e o título em `<h1>`.
          immersive
          lessonTitle={lesson.title}
          renderBlocks={(items) =>
            items.map((block) =>
              block.kind === 'video' ? (
                <LessonVideo key={block.id} content={block.content as unknown as VideoBlock} />
              ) : null,
            )
          }
        />
      </LessonPlayerProvider>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Raiz ausente')
createRoot(root).render(<Fixture />)
