import {
  evaluateLearning,
  type InteractiveBlock,
  type ManifestQuiz,
  publicInteractiveBlock,
} from '@sistemazero/core/learning'
import { LessonCopyProvider } from '@sistemazero/member-shell/components/lesson-copy-context'
import {
  type LessonPreviewContextValue,
  LessonPreviewProvider,
} from '@sistemazero/member-shell/components/lesson-preview-context'
import { PredictionQuiz } from '@sistemazero/member-shell/components/prediction-quiz'
import { SceneActivityView } from '@sistemazero/member-shell/components/scene-activity'
import { KIDS_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy-kids'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { jardimQuiz } from '../jardim-quiz'
const blocks = [{key:'quiz',content:jardimQuiz}]
function App() {
  const [index, setIndex] = useState(0),
    [completed, setCompleted] = useState(false)
  const authored = blocks[index]!,
    content = authored.content
  const preview: LessonPreviewContextValue = {
    answers: {},
    hintsUsed: {},
    results: {},
    workspaces: {},
    onWorkspaceChange: () => {},
    onProjectCheck: async () => '',
    onChange: () => {},
    onAttempt: async (_id, b, a) => evaluateLearning(b, a),
    onQuiz: async () => setCompleted(true),
  }
  return (
    <LessonCopyProvider value={KIDS_LESSON_COPY}>
      <LessonPreviewProvider value={preview}>
        <main className="test-page">
          <nav aria-label="Experiências">
            {blocks.map((b, i) => (
              <button
                type="button"
                key={b.key}
                onClick={() => {
                  setIndex(i)
                  setCompleted(false)
                }}
              >
                {b.key}
              </button>
            ))}
          </nav>
          <div key={authored.key}>
            {content.kind === 'quiz' ? (
              <PredictionQuiz blockId="quiz-revisao-final" content={content} quizState={null} />
            ) : (
              <Trial id={authored.key} content={content} />
            )}
          </div>
          <p data-complete={completed}>{completed ? 'Quiz conferido' : ''}</p>
        </main>
      </LessonPreviewProvider>
    </LessonCopyProvider>
  )
}
function Trial({ id, content }: { id: string; content: InteractiveBlock }) {
  if (content.activity.type !== 'experimentation') throw Error('Expected a scene experiment')
  const publicContent = publicInteractiveBlock(content)
  return (
    <SceneActivityView
      block={{ id, kind: 'interactive', sortOrder: 0, content: publicContent }}
      content={publicContent}
      activity={content.activity}
      previewContent={content}
    />
  )
}
createRoot(document.getElementById('root')!).render(<App />)
