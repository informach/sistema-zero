import {
  evaluateLearning,
  type InteractiveBlock,
  isInteractiveBlock,
  type LearningAnswers,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { LessonPreviewProvider } from '@sistemazero/member-shell/components/lesson-preview-context'
import { createEmptyProject } from '@sistemazero/studio/project'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import manifesto from '../../../../docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.manifesto.json'

const source = manifesto.blocks.find((block) => block.key === 'jogo-pronto')
if (
  !source ||
  !isInteractiveBlock(source.content) ||
  source.content.activity.type !== 'project-play'
)
  throw new Error('Jogo pronto ausente do manifesto')
const content: InteractiveBlock = structuredClone(source.content)
if (new URLSearchParams(location.search).get('completion') === 'participation') {
  const project = createEmptyProject('participation-fixture', 'Jogo clássico de participação')
  project.mode = 'code'
  project.files = {
    'index.html': '<button type="button">Jogar</button>',
    'style.css': 'button { margin: 24px; padding: 24px; }',
    'script.js': '',
  }
  content.activity = {
    type: 'project-play',
    completion: 'participation',
    project,
    stage: { width: 640, height: 360 },
    targets: [],
  }
}
const blockId = source.key
const root = document.getElementById('root')
if (!root) throw new Error('Raiz ausente')

function ProjectPlayFixture() {
  const [answers, setAnswers] = useState<Record<string, LearningAnswers>>({})
  const [outcome, setOutcome] = useState('Aguardando descoberta')

  return (
    <main className="sz-lesson-sections mx-auto max-w-3xl p-4">
      <LessonPreviewProvider
        value={{
          answers,
          hintsUsed: {},
          results: {},
          workspaces: {},
          onWorkspaceChange: () => {},
          onProjectCheck: async () => '',
          onChange: (id, next) => setAnswers((current) => ({ ...current, [id]: next })),
          onQuiz: async () => {},
          onAttempt: async (_id, block, submitted) => {
            const result = evaluateLearning(block, submitted)
            setOutcome(result.passed ? 'Jogo concluído' : 'Jogo incompleto')
            return result
          },
        }}
      >
        <div className="sz-lesson-block">
          <InteractiveLessonBlock
            block={{
              id: blockId,
              kind: 'interactive',
              sortOrder: 0,
              content: publicInteractiveBlock(content),
            }}
            previewContent={content}
          />
        </div>
      </LessonPreviewProvider>
      <output aria-label="Resultado do jogo">{outcome}</output>
    </main>
  )
}

createRoot(root).render(<ProjectPlayFixture />)
