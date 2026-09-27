import type { InteractiveBlock } from '@sistemazero/core/learning'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  EMPTY_LEARNING,
  LearningBuilder,
} from '../../../admin/src/components/editor/learning-builder'

/**
 * O ensaio das cenas, sem subir o app.
 *
 * ⚠️ Ele monta o editor REAL do admin e o bloco REAL da aula, um em cima do outro: é a única
 * forma de conferir que o que o professor configura é o que a criança recebe. Um ensaio com
 * seletores próprios conferiria a cópia, não o produto.
 */
function Preview() {
  const [content, setContent] = useState<InteractiveBlock>({
    ...EMPTY_LEARNING,
    activity: { type: 'experimentation', scene: 'hitbox' },
  })
  const [teacher, setTeacher] = useState(true)
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
      <nav className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-bold tracking-wider">SISTEMA ZERO · ENSAIO DAS CENAS</span>
        <div className="flex gap-3">
          <button
            type="button"
            aria-pressed={teacher}
            onClick={() => setTeacher(true)}
            className="min-h-11 rounded-xl border border-primary bg-card px-4 text-sm font-semibold"
          >
            Visão do professor
          </button>
          <button
            type="button"
            aria-pressed={!teacher}
            onClick={() => setTeacher(false)}
            className="min-h-11 rounded-xl border border-primary bg-card px-4 text-sm font-semibold"
          >
            Visão do aluno
          </button>
        </div>
      </nav>
      {teacher ? (
        <section className="space-y-4 rounded-2xl bg-card p-5">
          <h1 className="text-xl font-bold">Prepare a atividade</h1>
          <p className="text-sm text-muted-foreground">
            Este é o editor do admin, inteiro. Troque para a visão do aluno para ver o que a criança
            recebe. Nada é salvo nem publicado.
          </p>
          <LearningBuilder value={content} onChange={setContent} />
        </section>
      ) : (
        <InteractiveLessonBlock
          key={JSON.stringify(content.activity)}
          previewContent={content}
          block={{
            id: 'preview',
            kind: 'interactive',
            sortOrder: 0,
            blockRevision: 'preview',
            content,
          }}
        />
      )}
    </main>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Missing preview root')
createRoot(root).render(<Preview />)
