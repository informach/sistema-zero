import type { InteractiveBlock } from '@sistemazero/core/learning'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  EMPTY_LEARNING,
  LearningBuilder,
} from '../../../admin/src/components/editor/learning-builder'
import {
  newProjectPlayActivity,
  PROJECT_PLAY_TEXT,
} from '../../../admin/src/lib/project-play-authoring'

function AuthoringFixture() {
  const [value, setValue] = useState<InteractiveBlock>(() =>
    new URLSearchParams(location.search).has('scene')
      ? structuredClone(EMPTY_LEARNING)
      : { ...EMPTY_LEARNING, ...PROJECT_PLAY_TEXT, activity: newProjectPlayActivity() },
  )
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1>Autoria de jogo pronto</h1>
      <LearningBuilder value={value} onChange={setValue} />
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Raiz ausente')
createRoot(root).render(<AuthoringFixture />)
