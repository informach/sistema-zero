import { afterEach, describe, expect, test } from 'bun:test'
import type { InteractiveBlock, LearningAnswers, QuizGrade } from '@sistemazero/core/learning'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import {
  type LessonPreviewContextValue,
  LessonPreviewProvider,
} from '@sistemazero/member-shell/components/lesson-preview-context'
import type { Project } from '@sistemazero/studio'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const matchMediaOriginal = window.matchMedia
afterEach(() => {
  cleanup()
  window.matchMedia = matchMediaOriginal
})

/** O ensaio do admin, no mínimo: só o que a cena chama. */
function ensaio(onAttempt: LessonPreviewContextValue['onAttempt']): LessonPreviewContextValue {
  return {
    answers: {},
    hintsUsed: {},
    results: {},
    workspaces: {} as Record<string, Project>,
    onWorkspaceChange: () => {},
    onProjectCheck: async () => '',
    onChange: () => {},
    onAttempt,
    onQuiz: async (_id: string, _grade: QuizGrade) => {},
  }
}

function montar(content: InteractiveBlock, onAttempt: LessonPreviewContextValue['onAttempt']) {
  return render(
    <LessonPreviewProvider value={ensaio(onAttempt)}>
      <InteractiveLessonBlock
        block={{
          id: 'preview',
          blockRevision: 'preview',
          kind: 'interactive',
          sortOrder: 0,
          content,
        }}
        previewContent={content}
      />
    </LessonPreviewProvider>,
  )
}

const experimentacao: InteractiveBlock = {
  kind: 'interactive',
  title: 'Camadas',
  instructions: 'Mude a ordem.',
  hints: [],
  required: false,
  activity: { type: 'experimentation', scene: 'layers' },
}

type AttemptResult = Awaited<ReturnType<LessonPreviewContextValue['onAttempt']>>
const confirmed: AttemptResult = {
  participated: true,
  passed: true,
  feedback: 'ok',
  verifiedBy: 'client',
}

/** A ordem de desenhar da `layers`: o botão da peça de CIMA a leva para baixo (lote 5 do Raio-X). */
async function trocarOrdem(vezes: number) {
  for (let i = 0; i < vezes; i++)
    fireEvent.click(await screen.findByRole('button', { name: /^Descer / }))
}

describe('a prévia de autoria', () => {
  test('⚠️ falhar e tentar de novo REGISTRA: o botão não é um clique morto', async () => {
    // A primeira ida consome os comandos pendentes. Enquanto o registro dependia de haver
    // comando novo, a segunda tentativa saía sem fazer nada e o erro ficava na tela para sempre.
    let falhar = true
    let rejectAttempt: ((error: Error) => void) | null = null
    let confirmAttempt: (result: AttemptResult) => void = () => {}
    const tentativas: string[] = []
    montar(
      experimentacao,
      (blockId) =>
        new Promise<AttemptResult>((resolve, reject) => {
          if (falhar) rejectAttempt = reject
          else {
            tentativas.push(blockId)
            confirmAttempt = resolve
          }
        }),
    )
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): concluir a `layers` são três trocas de ordem.
    await trocarOrdem(3)
    await waitFor(() => expect(rejectAttempt).not.toBeNull())
    await act(async () => {
      rejectAttempt?.(new Error('Falha de salvamento simulada'))
    })
    // A falha do ensaio aparece com as palavras DELE, não como "aguardando conexão".
    expect(await screen.findByText('Falha de salvamento simulada')).toBeTruthy()
    expect(tentativas).toEqual([])
    falhar = false
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tentar salvar' }))
    })
    await waitFor(() => expect(tentativas).toEqual(['preview']), { timeout: 5000 })
    await act(async () => {
      confirmAttempt(confirmed)
    })
  })

  test('a experimentação registra assim que a criança fecha as metas', async () => {
    const tentativas: LearningAnswers[] = []
    let confirm: (result: AttemptResult) => void = () => {}
    const pending = new Promise<AttemptResult>((resolve) => {
      confirm = resolve
    })
    montar(experimentacao, (_id, _content, answers) => {
      tentativas.push(answers)
      return pending
    })
    await trocarOrdem(3)
    await waitFor(() => expect(tentativas).toHaveLength(1), { timeout: 5000 })
    await act(async () => {
      confirm(confirmed)
      await pending
    })
    // O que sobe é o checkpoint confirmado, não um objeto vazio.
    expect(tentativas[0]?.sceneCheckpoint).toBeDefined()
  })
})
