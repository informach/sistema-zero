import {
  evaluateLearning,
  type InteractiveBlock,
  type LearningAnswers,
} from '@sistemazero/core/learning'
import { LearningHtml } from '@sistemazero/member-shell/components/learning-html'
import { LessonSections } from '@sistemazero/member-shell/components/lesson-sections'
import type { LessonDetailView } from '@sistemazero/member-shell/lib/types'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import day1 from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-1/manifesto.json'
import day2 from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-2/manifesto.json'
import day3 from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-3/manifesto.json'
import day4 from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-4/manifesto.json'
import day5 from '../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-5/manifesto.json'

const experiments = [day1, day2, day3, day4, day5].flatMap((day) =>
  day.blocks.flatMap((b) =>
    'content' in b && b.content?.kind === 'interactive' && b.content.activity?.type === 'html'
      ? [{ key: b.key, content: b.content as InteractiveBlock }]
      : [],
  ),
)
const lesson: LessonDetailView = {
  id: 'spacing-preview',
  slug: 'spacing-preview',
  courseSlug: 'desafio-primeiro-jogo',
  moduleId: 'preview',
  title: 'Ensaio de espaçamento',
  completed: false,
  positionSeconds: null,
  estimatedMinutes: null,
  attachments: [],
  blocks: [
    {
      id: 'exemplo',
      kind: 'rich_text',
      sortOrder: 0,
      content: { kind: 'rich_text', markdown: 'Observe o endereço da nave.' },
    },
    {
      id: 'orientacao',
      kind: 'rich_text',
      sortOrder: 1,
      content: { kind: 'rich_text', markdown: 'Crie a nave e configure sua posição.' },
    },
    { id: 'projeto', kind: 'studio', sortOrder: 2, content: { kind: 'studio' } },
  ],
  sections: [
    {
      id: 'ver',
      title: 'Observe o endereço na tela',
      blockIds: ['exemplo'],
      workspaceBlockId: null,
      externalTool: null,
    },
    {
      id: 'montar',
      title: 'Crie sua nave',
      blockIds: ['orientacao', 'projeto'],
      workspaceBlockId: 'projeto',
      externalTool: null,
    },
  ],
}
function Preview() {
  const [index, setIndex] = useState(0),
    [mount, setMount] = useState(0),
    [answers, setAnswers] = useState<Record<string, LearningAnswers>>({})
  const spacing = new URLSearchParams(location.search).has('spacing')
  const current = experiments[index]!,
    value = answers[current.key] ?? {}
  if (spacing)
    return (
      <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-8">
        <h1 className="text-xl font-bold">Ensaio local · layout real, conteúdo de exemplo</h1>
        <LessonSections
          kids
          lesson={lesson}
          renderBlocks={(blocks) =>
            blocks.map((b) => (
              <div key={b.id} className="min-h-60 rounded-xl bg-sky-950 p-6 text-white">
                {b.kind === 'studio'
                  ? 'Área reservada ao Estúdio nesta prévia de layout.'
                  : String((b.content as { markdown: string }).markdown)}
              </div>
            ))
          }
        />
      </main>
    )
  if (current.content.activity.type !== 'html') return null
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-3">
      <h1 className="text-xl font-bold">Ensaio local · Desafio do Primeiro Jogo</h1>
      <div className="flex flex-wrap gap-3">
        <select
          className="min-h-11 max-w-full rounded-xl border border-border bg-card px-3"
          aria-label="Experimento"
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
        >
          {experiments.map((e, i) => (
            <option key={e.key} value={i}>
              {e.key}
            </option>
          ))}
        </select>
        <button
          className="min-h-11 rounded-xl border border-border bg-card px-3"
          type="button"
          onClick={() => setMount((n) => n + 1)}
        >
          Reabrir com o estado guardado
        </button>
      </div>
      <LearningHtml
        key={`${current.key}-${mount}`}
        html={current.content.activity.html}
        title={current.key}
        answers={value}
        onChange={(next) => setAnswers((prev) => ({ ...prev, [current.key]: next }))}
      />
      <fieldset className="rounded-xl border border-border bg-card p-4">
        <legend>{current.content.checkpoint!.prompt}</legend>
        {current.content.checkpoint!.choices.map((choice) => (
          <label key={choice.id} className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name={current.key}
              value={choice.id}
              checked={value.checkpoint === choice.id}
              onChange={() =>
                setAnswers((prev) => ({
                  ...prev,
                  [current.key]: { ...value, checkpoint: choice.id },
                }))
              }
            />
            {choice.label}
          </label>
        ))}
      </fieldset>
      <p id="grading" role="status">
        {evaluateLearning(current.content, value).feedback}
      </p>
      <details>
        <summary>Estado de teste</summary>
        <pre id="state" className="whitespace-pre-wrap">
          {JSON.stringify(value)}
        </pre>
      </details>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<Preview />)
