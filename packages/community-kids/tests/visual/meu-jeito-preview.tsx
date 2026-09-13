import {
  evaluateLearning,
  type InteractiveBlock,
  type LearningAnswers,
} from '@sistemazero/core/learning'
import { LearningHtml } from '@sistemazero/member-shell/components/learning-html'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import lesson2 from '../../../../docs/aulas-interativas/o-jogo-do-meu-jeito-v6/aula-02/manifesto.json'
import lesson3 from '../../../../docs/aulas-interativas/o-jogo-do-meu-jeito-v6/aula-03/manifesto.json'
import lesson4 from '../../../../docs/aulas-interativas/o-jogo-do-meu-jeito-v6/aula-04/manifesto.json'
import lesson5 from '../../../../docs/aulas-interativas/o-jogo-do-meu-jeito-v6/aula-05/manifesto.json'
import lesson6 from '../../../../docs/aulas-interativas/o-jogo-do-meu-jeito-v6/aula-06/manifesto.json'

const experiments = [lesson2, lesson3, lesson4, lesson5, lesson6].flatMap((lesson) =>
  lesson.blocks.flatMap((b) =>
    'content' in b && b.content?.kind === 'interactive' && b.content.activity?.type === 'html'
      ? [{ key: b.key, content: b.content as InteractiveBlock }]
      : [],
  ),
)
function Preview() {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, LearningAnswers>>({})
  const [mount, setMount] = useState(0)
  const current = experiments[index]!
  const value = answers[current.key] ?? {}
  if (current.content.activity.type !== 'html') return null
  return (
    <main style={{ maxWidth: 850, margin: 'auto', padding: 12 }}>
      <h1 style={{ fontSize: 20 }}>Ensaio local · O jogo do meu jeito</h1>
      <label>
        Experimento{' '}
        <select
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
      </label>
      <button type="button" onClick={() => setMount((n) => n + 1)}>
        Reabrir com o estado guardado
      </button>
      <p>{current.content.instructions}</p>
      <LearningHtml
        key={`${current.key}-${mount}`}
        html={current.content.activity.html}
        title={current.key}
        answers={value}
        onChange={(next) => setAnswers((previous) => ({ ...previous, [current.key]: next }))}
      />
      <fieldset>
        <legend>{current.content.checkpoint!.prompt}</legend>
        {current.content.checkpoint!.choices.map((choice) => (
          <label key={choice.id} style={{ display: 'block', padding: 8 }}>
            <input
              type="radio"
              name={current.key}
              value={choice.id}
              checked={value.checkpoint === choice.id}
              onChange={() =>
                setAnswers((previous) => ({
                  ...previous,
                  [current.key]: { ...value, checkpoint: choice.id },
                }))
              }
            />
            {choice.label}
          </label>
        ))}
      </fieldset>
      <p role="status" id="grading">
        {evaluateLearning(current.content, value).feedback}
      </p>
      <details>
        <summary>Estado de teste</summary>
        <pre id="state" style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      </details>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<Preview />)
