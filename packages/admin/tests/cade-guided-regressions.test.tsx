import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  type InteractiveBlock,
  isManifestQuiz,
  isSectionExecutionRule,
  type SectionExecutionRule,
} from '@sistemazero/core/learning'
import type { QuizBlock } from '@sistemazero/member-shell/lib/types'
import aula1 from '../../../docs/aulas-interativas/cade-todo-mundo/cade-todo-mundo-aula-1.manifesto.json'
import aula2 from '../../../docs/aulas-interativas/cade-todo-mundo/cade-todo-mundo-aula-2.manifesto.json'
import certificado from '../../../docs/aulas-interativas/cade-todo-mundo/cade-todo-mundo-certificado.manifesto.json'
import type { QuizBlock as AuthoredQuiz } from '../../members/src/domain/course/lesson-block'
import { validateQuizAuthoring } from '../../members/src/domain/course/quiz'
import { parseQuizImport } from '../src/lib/lesson-block-import'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LearningBuilder } = await import('../src/components/editor/learning-builder')
const { ExecutionRuleEditor } = await import('../src/components/editor/execution-rule-editor')
const { PredictionQuiz } = await import('../../member-shell/src/components/prediction-quiz')
const { LessonPlayerProvider } = await import(
  '../../member-shell/src/components/lesson-player-context'
)
const { LessonPreviewProvider } = await import(
  '../../member-shell/src/components/lesson-preview-context'
)

import type { LessonPreviewContextValue } from '../../member-shell/src/components/lesson-preview-context'

const quiz = certificado.blocks.find((b) => b.key === 'quiz-revisao-final')!.content as AuthoredQuiz
function mountPoint() {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  return {
    host,
    root,
    async close() {
      await act(async () => root.unmount())
      host.remove()
    },
  }
}
function button(host: HTMLElement, name: string) {
  const found = [...host.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === name || b.getAttribute('aria-label') === name,
  )
  if (!found) throw Error(`Botão ausente: ${name}`)
  return found
}

test('rascunho do aluno sobrevive à remontagem e fica isolado por perfil e conteúdo', async () => {
  const ui = mountPoint()
  const content: QuizBlock = quiz
  const render = (viewerId: string, nextContent = content) =>
    ui.root.render(
      <LessonPlayerProvider
        value={{
          lessonId: 'draft-test',
          courseSlug: 'cade',
          viewerId,
          viewerWatermark: null,
          initialPositionSeconds: null,
        }}
      >
        <PredictionQuiz blockId="review" content={nextContent} quizState={null} />
      </LessonPlayerProvider>,
    )
  try {
    await act(async () => render('student-a'))
    await act(async () => ui.host.querySelector<HTMLButtonElement>('[role="radio"]')!.click())
    await act(async () => ui.root.render(null))
    await act(async () => render('student-a'))
    expect(ui.host.querySelectorAll('[role="radio"][aria-checked="true"]').length).toBe(1)
    await act(async () => render('student-b'))
    expect(ui.host.querySelectorAll('[role="radio"][aria-checked="true"]').length).toBe(0)
    await act(async () =>
      render('student-a', {
        ...content,
        questions: content.questions.map((q, i) =>
          i === 0 ? { ...q, prompt: 'Outro enunciado' } : q,
        ),
      }),
    )
    expect(ui.host.querySelectorAll('[role="radio"][aria-checked="true"]').length).toBe(0)
  } finally {
    localStorage.removeItem('sz:prediction-draft:student-a:draft-test:review')
    await ui.close()
  }
})

test('abrir e renderizar novamente as falas do jardim não altera o conteúdo', async () => {
  const ui = mountPoint()
  let writes = 0
  let value = aula1.blocks.find((b) => b.key === 'experiencia-toque')!.content as InteractiveBlock
  const render = () =>
    ui.root.render(
      <LearningBuilder
        value={value}
        onChange={(next) => {
          writes++
          value = next
          if (writes < 10) render()
        }}
      />,
    )
  try {
    await act(async () => render())
    await act(async () => render())
    expect(writes).toBe(0)
  } finally {
    await ui.close()
  }
})

test('editar passos preserva as referências das verificações e mostra o seletor', async () => {
  const ui = mountPoint()
  const section = aula2.sections.find((s) => s.completion?.projectChecks?.length)!
  let rule = structuredClone(
    section.completion!.projectChecks!.find((c) => c.id === 'mensagem-tres-achados')!.rule,
  ) as SectionExecutionRule
  const render = () =>
    ui.root.render(
      <ExecutionRuleEditor
        rule={rule}
        index={0}
        isPro={false}
        isKit={false}
        onChange={(next) => {
          rule = next
          render()
        }}
      />,
    )
  try {
    await act(async () => render())
    expect(
      ui.host.querySelector<HTMLInputElement>('[aria-label="Seletor do texto do objetivo 1"]')
        ?.value,
    ).toContain('data-sz-hud-kind')
    expect(ui.host.querySelectorAll('select[aria-label^="Momento da verificação"]').length).toBe(4)
    await act(async () => button(ui.host, 'Tirar o passo 1').click())
    expect(isSectionExecutionRule(rule)).toBe(true)
    if (rule.type !== 'behavior') throw Error('Regra inesperada')
    expect(rule.checkpoints?.map((p) => p.afterStep)).toEqual([2, 4, 6])
    const moment = ui.host.querySelector<HTMLSelectElement>(
      '[aria-label="Momento da verificação 1 do objetivo 1"]',
    )!
    await act(async () => {
      moment.value = '0'
      moment.dispatchEvent(new Event('change', { bubbles: true }))
    })
    if (rule.type !== 'behavior') throw Error('Regra inesperada')
    expect(rule.checkpoints?.[0]?.afterStep).toBe(0)
    await act(async () => button(ui.host, 'Adicionar verificação intermediária').click())
    expect(isSectionExecutionRule(rule)).toBe(true)
    await act(async () => button(ui.host, 'Tirar verificação 4').click())
    expect(isSectionExecutionRule(rule)).toBe(true)
  } finally {
    await ui.close()
  }
})

test('manifesto, autoria e importação recusam previsão mista e múltiplas corretas', () => {
  for (const issue of ['mixed', 'multiple']) {
    const invalid = structuredClone(quiz)
    if (issue === 'mixed') delete invalid.questions[1]!.predictionScene
    else
      invalid.questions[0]!.correctChoiceIds = invalid.questions[0]!.choices.slice(0, 2).map(
        (c) => c.id,
      )
    expect(isManifestQuiz(invalid)).toBe(false)
    expect(validateQuizAuthoring(invalid)).not.toBeNull()
    const imported = parseQuizImport(
      JSON.stringify({
        questions: invalid.questions.map((q) => ({
          predictionScene: q.predictionScene,
          prompt: q.prompt,
          choices: q.choices.map((c) => ({
            label: c.label,
            correct: q.correctChoiceIds.includes(c.id),
          })),
        })),
      }),
    )
    expect(imported.success).toBe(false)
  }
})

test('prévia sem nota corrige e retoma a pergunta após desmontar, sem confiar em correção local', async () => {
  const ui = mountPoint()
  const content: QuizBlock = { ...quiz, passingScore: undefined }
  function Harness() {
    const [visible, setVisible] = useState(true)
    const [answers, setAnswers] = useState<LessonPreviewContextValue['answers']>({})
    const rehearsal: LessonPreviewContextValue = {
      answers,
      hintsUsed: {},
      results: {},
      workspaces: {},
      onWorkspaceChange() {},
      onProjectCheck: async () => '',
      onAttempt: async () => {
        throw Error('Não usado')
      },
      onQuiz: async () => {},
      onChange: (id, next) => setAnswers((current) => ({ ...current, [id]: next })),
    }
    return (
      <LessonPreviewProvider value={rehearsal}>
        <button type="button" onClick={() => setVisible((v) => !v)}>
          Alternar parte
        </button>
        {visible && <PredictionQuiz blockId="review" content={content} quizState={null} />}
      </LessonPreviewProvider>
    )
  }
  try {
    await act(async () => ui.root.render(<Harness />))
    const correct = quiz.questions[0]!.choices.findIndex((c) =>
      quiz.questions[0]!.correctChoiceIds.includes(c.id),
    )
    await act(async () =>
      ui.host.querySelectorAll<HTMLButtonElement>('[role="radio"]')[correct]!.click(),
    )
    await act(async () => button(ui.host, 'Ver o que acontece').click())
    expect(ui.host.querySelector('[role="alert"]')).toBeNull()
    await act(async () => button(ui.host, 'Próxima pergunta').click())
    await act(async () => ui.host.querySelector<HTMLButtonElement>('[role="radio"]')!.click())
    await act(async () => button(ui.host, 'Alternar parte').click())
    await act(async () => button(ui.host, 'Alternar parte').click())
    expect(ui.host.querySelector('#prediction-prompt')?.textContent).toBe(quiz.questions[1]!.prompt)
    expect(ui.host.querySelectorAll('[role="radio"][aria-checked="true"]').length).toBe(1)
    expect(ui.host.querySelector('[data-quiz-scene]')?.getAttribute('data-quiz-scene')).toBe(
      'question',
    )
  } finally {
    await ui.close()
  }
})
