import { afterEach, describe, expect, test } from 'bun:test'
import type { InteractiveBlock, LearningAnswers, QuizGrade } from '@sistemazero/core/learning'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import {
  type LessonPreviewContextValue,
  LessonPreviewProvider,
} from '@sistemazero/member-shell/components/lesson-preview-context'
import type { Project } from '@sistemazero/studio'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

afterEach(cleanup)

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

/**
 * ⚠️ A cena é `jump-sound` DE PROPÓSITO, com o roteiro DO MODELO.
 *
 * O defeito que este teste guarda é o registro perguntar ao avaliador da experimentação, que
 * cobra as metas da cena. Medido: em DOZE das catorze cenas o roteiro do modelo fecha as metas
 * por coincidência do último passo, e só `jump-sound` e `controls` não fecham. Um teste numa
 * das doze passa com o código defeituoso — é o que ele fazia com `layers`.
 */
const demonstracao: InteractiveBlock = {
  kind: 'interactive',
  title: 'O som acompanha o salto',
  instructions: 'Observe.',
  hints: [],
  required: false,
  activity: { type: 'demonstration', scene: 'jump-sound' },
}

describe('a prévia de autoria', () => {
  test('⚠️ a DEMONSTRAÇÃO também registra a tentativa', async () => {
    // O registro perguntava ao avaliador da EXPERIMENTAÇÃO, que cobra as metas da cena. Quem
    // só assistiu nunca as alcança, então uma seção cujo critério fosse uma demonstração não
    // destravava no ensaio — e o professor publicaria uma aula que trava a criança.
    const tentativas: string[] = []
    montar(demonstracao, async (blockId) => {
      tentativas.push(blockId)
      return { participated: true, passed: true, feedback: 'ok', verifiedBy: 'client' }
    })
    const passo = await screen.findByRole('button', { name: 'Um passo' })
    // "Um passo" avança o relógio; entre as etapas é preciso pedir a próxima, como a criança faz.
    for (let i = 0; i < 200 && tentativas.length === 0; i++) {
      const proxima = screen.queryByRole('button', { name: 'Próxima etapa' }) as
        | HTMLButtonElement
        | undefined
      await act(async () => {
        fireEvent.click(proxima && !proxima.disabled ? proxima : passo)
      })
    }
    expect(tentativas).toEqual(['preview'])
  })

  test('⚠️ falhar e tentar de novo REGISTRA: o botão não é um clique morto', async () => {
    // A primeira ida consome os comandos pendentes. Enquanto o registro dependia de haver
    // comando novo, a segunda tentativa saía sem fazer nada e o erro ficava na tela para sempre.
    let falhar = true
    const tentativas: string[] = []
    montar(experimentacao, async (blockId) => {
      if (falhar) throw new Error('Falha de salvamento simulada')
      tentativas.push(blockId)
      return { participated: true, passed: true, feedback: 'ok', verifiedBy: 'client' }
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Depois' }))
    // A falha do ensaio aparece com as palavras DELE, não como "aguardando conexão".
    expect(await screen.findByText('Falha de salvamento simulada')).toBeTruthy()
    expect(tentativas).toEqual([])
    falhar = false
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tentar salvar' }))
    })
    await waitFor(() => expect(tentativas).toEqual(['preview']), { timeout: 5000 })
  })

  test('a experimentação registra assim que a criança fecha as metas', async () => {
    const tentativas: LearningAnswers[] = []
    montar(experimentacao, async (_id, _content, answers) => {
      tentativas.push(answers)
      return { participated: true, passed: true, feedback: 'ok', verifiedBy: 'client' }
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Depois' }))
    await waitFor(() => expect(tentativas).toHaveLength(1), { timeout: 5000 })
    // O que sobe é o checkpoint confirmado, não um objeto vazio.
    expect(tentativas[0]?.sceneCheckpoint).toBeDefined()
  })
})
