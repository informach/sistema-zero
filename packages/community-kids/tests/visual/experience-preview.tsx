import {
  EXPLORATION_DEFINITIONS,
  EXPLORATION_MISSIONS,
  type ExplorationActivity,
  type InteractiveBlock,
} from '@sistemazero/core/learning'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ExperienceAuthoring } from '../../../admin/src/components/editor/experience-authoring'

function Preview() {
  const [activity, setActivity] = useState<ExplorationActivity>({
    type: 'exploration',
    version: 3,
    mission: 'hitbox',
  })
  const [teacher, setTeacher] = useState(false)
  const d = EXPLORATION_DEFINITIONS[activity.mission]
  const content: InteractiveBlock = {
    kind: 'interactive',
    title: d.title,
    instructions: d.instruction,
    hints: [...d.hints],
    required: false,
    activity,
  }
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
      <nav className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-bold tracking-wider">SISTEMA ZERO · ENSAIO V6</span>
        <select
          aria-label="Missão"
          value={activity.mission}
          onChange={(e) => {
            const mission = EXPLORATION_MISSIONS.find((m) => m === e.target.value)
            if (mission) setActivity({ type: 'exploration', version: 3, mission })
          }}
          className="min-h-11 rounded-xl border border-border bg-card px-3"
        >
          {EXPLORATION_MISSIONS.map((m) => (
            <option key={m} value={m}>
              {EXPLORATION_DEFINITIONS[m].title}
            </option>
          ))}
        </select>
      </nav>
      <div className="flex gap-3">
        <button
          type="button"
          aria-pressed={!teacher}
          onClick={() => setTeacher(false)}
          className="min-h-11 rounded-xl border border-primary bg-card px-4 text-sm font-semibold"
        >
          Visão do aluno
        </button>
        <button
          type="button"
          aria-pressed={teacher}
          onClick={() => setTeacher(true)}
          className="min-h-11 rounded-xl border border-primary bg-card px-4 text-sm font-semibold"
        >
          Visão do professor
        </button>
      </div>
      {teacher && (
        <section className="space-y-4 rounded-2xl bg-card p-5">
          <h1 className="text-xl font-bold">Prepare a experiência</h1>
          <p className="text-sm text-muted-foreground">
            Escolha a missão acima. Configure a experiência aqui e confira abaixo o que o aluno vai
            encontrar. Este ensaio usa os componentes reais do editor e da aula, sem salvar ou
            publicar.
          </p>
          <ExperienceAuthoring key={activity.mission} activity={activity} onChange={setActivity} />
        </section>
      )}
      <InteractiveLessonBlock
        key={JSON.stringify(activity)}
        previewContent={content}
        block={{
          id: `preview-${activity.mission}`,
          kind: 'interactive',
          sortOrder: 0,
          blockRevision: 'preview',
          content,
        }}
      />
    </main>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Missing preview root')
createRoot(root).render(<Preview />)
