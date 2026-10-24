import { isInteractiveBlock, publicInteractiveBlock } from '@sistemazero/core/learning'
import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import { LessonSections } from '@sistemazero/member-shell/components/lesson-sections'
import { StudioBlockView } from '@sistemazero/member-shell/components/studio/studio-block'
import type {
  DialogueBlock,
  LessonBlockView,
  LessonDetailView,
  StudioBlock,
} from '@sistemazero/member-shell/lib/types'
import { createEmptyProject } from '@sistemazero/studio'
import { createRoot } from 'react-dom/client'
import manifesto from '../../../../docs/aulas-interativas/nave-contra-asteroides/nave-contra-asteroides-primeira-nave.manifesto.json'

// Standalone authoring preview: real components and CSS, no learner identity or remote services.
const studio: StudioBlock = {
  kind: 'studio',
  purpose: 'experiment',
  initialProject: createEmptyProject('layout-preview', 'Meu projeto'),
  level: 'intermediario',
}
const dialogue: DialogueBlock = {
  kind: 'dialogue',
  text: 'Agora faça o personagem aparecer ao tocar no esconderijo.',
}
const scene = new URLSearchParams(location.search).get('kind') === 'scene'
const source = manifesto.blocks.find((block) => block.key === 'experiencia-coordenadas')
if (!source || !isInteractiveBlock(source.content)) throw new Error('Cena de coordenadas ausente')
const sceneContent = publicInteractiveBlock(source.content)
const workspace: LessonBlockView = scene
  ? { id: 'scene', kind: 'interactive', sortOrder: 1, content: sceneContent }
  : { id: 'studio', kind: 'studio', sortOrder: 1, content: studio }
const lesson: LessonDetailView = {
  id: 'layout-preview',
  slug: 'layout-preview',
  courseSlug: 'layout-preview',
  moduleId: 'layout-preview',
  title: 'A bancada da aula',
  completed: false,
  positionSeconds: null,
  estimatedMinutes: null,
  attachments: [],
  structureRevision: 'layout-preview-r1',
  blocks: [{ id: 'dialogue', kind: 'dialogue', sortOrder: 0, content: dialogue }, workspace],
  sections: [
    {
      id: 'create',
      title: 'Faça alguém aparecer',
      blockIds: ['dialogue', workspace.id],
      workspaceBlockId: workspace.id,
      externalTool: null,
      completion: scene
        ? undefined
        : {
            version: 1,
            blockIds: [],
            projectChecks: [
              { id: 'touch', label: 'Revele o personagem tocado.', kind: 'idea' },
              { id: 'hide', label: 'Esconda novamente o personagem.', kind: 'idea' },
              {
                id: 'extra',
                label: 'Experimente outro esconderijo.',
                kind: 'idea',
                optional: true,
              },
            ],
          },
    },
  ],
}
const root = document.getElementById('root')
if (!root) throw new Error('Raiz ausente')
createRoot(root).render(
  <main className="kids-aula mx-auto max-w-[1400px] p-4">
    <LessonPlayerProvider
      value={{
        lessonId: '',
        viewerId: null,
        courseSlug: lesson.courseSlug,
        viewerWatermark: null,
        initialPositionSeconds: null,
      }}
    >
      <LessonSections
        lesson={lesson}
        kids
        renderBlocks={(blocks) =>
          blocks.map((block) =>
            block.kind === 'studio' ? (
              <StudioBlockView
                key={block.id}
                blockId={block.id}
                content={studio}
                studioState={null}
              />
            ) : block.kind === 'interactive' ? (
              <InteractiveLessonBlock key={block.id} block={block} />
            ) : (
              <DialogueBlockView
                key={block.id}
                content={dialogue}
                mascot={
                  <span role="img" aria-label="Zappy">
                    ✦
                  </span>
                }
                speech={{
                  texts: [dialogue.text],
                  audioUrl: '/voice.mp3',
                  fallbackToBrowser: false,
                }}
              />
            ),
          )
        }
      />
    </LessonPlayerProvider>
  </main>,
)
