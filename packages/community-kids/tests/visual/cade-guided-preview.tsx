import {
  evaluateLearning,
  type InteractiveBlock,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import { DialogueBlockView } from '@sistemazero/member-shell/components/dialogue-block'
import { LessonCopyProvider } from '@sistemazero/member-shell/components/lesson-copy-context'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import {
  type LessonPreviewContextValue,
  LessonPreviewProvider,
} from '@sistemazero/member-shell/components/lesson-preview-context'
import { SceneActivityView } from '@sistemazero/member-shell/components/scene-activity'
import { KIDS_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy-kids'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import aula1 from '../../../../docs/aulas-interativas/faisca/cade-todo-mundo/cade-todo-mundo-aula-1.manifesto.json'
import aula2 from '../../../../docs/aulas-interativas/faisca/cade-todo-mundo/cade-todo-mundo-aula-2.manifesto.json'
import certificado from '../../../../docs/aulas-interativas/faisca/cade-todo-mundo/cade-todo-mundo-certificado.manifesto.json'
import { KidsQuiz } from '../../src/components/kids/kids-quiz'
import { KidsMascot } from '../../src/components/kids/mascot'

/** Real components, real manifests and the explicit author-rehearsal boundary; no account. */
const PrototypeMascot = () => <KidsMascot expression="speaking" className="size-16 sm:size-20" />
function Preview() {
  const [part, setPart] = useState('touch')
  const [grade, setGrade] = useState(0)
  const [answers, setAnswers] = useState<LessonPreviewContextValue['answers']>({})
  const rehearsal: LessonPreviewContextValue = {
    answers,
    hintsUsed: {},
    results: {},
    workspaces: {},
    onWorkspaceChange: () => {},
    onProjectCheck: async () => '',
    onChange: (id, next) => setAnswers((previous) => ({ ...previous, [id]: next })),
    onAttempt: async (_id, block, answers) => evaluateLearning(block, answers),
    onQuiz: async (_id, result) => {
      if (result.passed) setGrade((v) => v + 1)
    },
  }
  const source = (part === 'touch' ? aula1 : aula2).blocks.find(
    (b) => b.key === (part === 'touch' ? 'experiencia-toque' : 'experiencia-achados'),
  )!.content as InteractiveBlock
  const content = publicInteractiveBlock(source)
  const quiz = certificado.blocks.find((b) => b.key === 'quiz-revisao-final')!.content
  return (
    <LessonCopyProvider value={KIDS_LESSON_COPY}>
      <LessonPreviewProvider value={rehearsal}>
        <LessonPlayerProvider
          value={{
            lessonId: 'preview',
            courseSlug: 'cade-todo-mundo',
            viewerId: null,
            viewerWatermark: null,
            initialPositionSeconds: null,
            videoGateMascot: <PrototypeMascot />,
            renderInstruction: (text, _pose, speech) => (
              <DialogueBlockView
                content={{ kind: 'dialogue', text }}
                speech={speech}
                mascot={<PrototypeMascot />}
              />
            ),
          }}
        >
          <main className="prototype-page sz-lesson-sections">
            <label>
              Ensaio do curso real{' '}
              <select id="part" value={part} onChange={(e) => setPart(e.target.value)}>
                <option value="touch">Toque</option>
                <option value="counter">Achados</option>
                <option value="quiz">Quiz</option>
              </select>
            </label>
            <output data-completed-quiz>{grade}</output>
            <div key={part} className="sz-lesson-block">
              {part === 'quiz' ? (
                <KidsQuiz blockId="quiz" content={quiz as never} quizState={null} />
              ) : (
                <SceneActivityView
                  block={{ id: part, kind: 'interactive', sortOrder: 0, content } as never}
                  content={content}
                  activity={content.activity as never}
                  previewContent={source}
                />
              )}
            </div>
          </main>
        </LessonPlayerProvider>
      </LessonPreviewProvider>
    </LessonCopyProvider>
  )
}
createRoot(document.getElementById('root')!).render(<Preview />)
