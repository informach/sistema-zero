import type { InteractiveBlock } from '@sistemazero/core/learning'
import { SCENE_IDS, SCENE_MODELS, type SceneActivity } from '@sistemazero/core/learning/scene'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ExperienceAuthoring } from '../../../admin/src/components/editor/experience-authoring'

function Preview() {
  const [activity, setActivity] = useState<SceneActivity>({
    type: 'experimentation',
    scene: 'hitbox',
  })
  const [teacher, setTeacher] = useState(false)
  const d = SCENE_MODELS[activity.scene]
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
        <span className="text-sm font-bold tracking-wider">SISTEMA ZERO · ENSAIO DAS CENAS</span>
        <div className="flex flex-wrap gap-3">
          <select
            aria-label="Tipo"
            value={activity.type}
            onChange={(e) =>
              setActivity(
                e.target.value === 'demonstration'
                  ? { type: 'demonstration', scene: activity.scene }
                  : { type: 'experimentation', scene: activity.scene },
              )
            }
            className="min-h-11 rounded-xl border border-border bg-card px-3"
          >
            <option value="experimentation">Experimentação</option>
            <option value="demonstration">Demonstração</option>
          </select>
          <select
            aria-label="Cena"
            value={activity.scene}
            onChange={(e) => {
              const scene = SCENE_IDS.find((s) => s === e.target.value)
              if (scene) setActivity({ ...activity, scene })
            }}
            className="min-h-11 rounded-xl border border-border bg-card px-3"
          >
            {SCENE_IDS.map((id) => (
              <option key={id} value={id}>
                {SCENE_MODELS[id].title}
              </option>
            ))}
          </select>
        </div>
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
            Escolha o tipo e a cena acima. Configure a experiência aqui e confira abaixo o que o
            aluno vai encontrar. Este ensaio usa os componentes reais do editor e da aula, sem
            salvar ou publicar.
          </p>
          <ExperienceAuthoring key={activity.scene} activity={activity} onChange={setActivity} />
        </section>
      )}
      <InteractiveLessonBlock
        key={JSON.stringify(activity)}
        previewContent={content}
        block={{
          id: `preview-${activity.type}-${activity.scene}`,
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
