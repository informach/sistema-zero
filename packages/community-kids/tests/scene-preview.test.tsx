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

/** O relógio do navegador na MÃO: cada `tocar(n)` roda `n` quadros a 60 Hz. */
function relogioManual() {
  const rafOriginal = window.requestAnimationFrame
  const cafOriginal = window.cancelAnimationFrame
  const fila = new Map<number, FrameRequestCallback>()
  let proximo = 0
  let agora = 0
  window.requestAnimationFrame = (cb) => {
    proximo += 1
    fila.set(proximo, cb)
    return proximo
  }
  window.cancelAnimationFrame = (id) => {
    fila.delete(id)
  }
  return {
    async tocar(quadros: number) {
      for (let i = 0; i < quadros; i++) {
        agora += 1000 / 60
        const chamados = [...fila.values()]
        fila.clear()
        await act(async () => {
          for (const cb of chamados) cb(agora)
        })
      }
    },
    restaurar() {
      window.requestAnimationFrame = rafOriginal
      window.cancelAnimationFrame = cafOriginal
    },
  }
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
 * ⚠️ A cena é `controls` DE PROPÓSITO, com o roteiro DO MODELO.
 *
 * O defeito que este teste guarda é o registro perguntar ao avaliador da experimentação, que
 * cobra as metas da cena. Medido: em DOZE das catorze cenas o roteiro do modelo fecha as metas
 * por coincidência do último passo, e só `jump-sound` e `controls` não fechavam. Um teste numa
 * das doze passa com o código defeituoso — é o que ele fazia com `layers`.
 * ⚠️ Mudou de propósito (lote 5 do Raio-X): o roteiro novo da `jump-sound` passa pelas três metas
 * dela (som sem pulo, pulo sem som e um som em cada pulo) e passou a fechá-las; a `controls` segue
 * sem o Enter no roteiro.
 */
const demonstracao: InteractiveBlock = {
  kind: 'interactive',
  title: 'O convite para começar',
  instructions: 'Observe.',
  hints: [],
  required: false,
  activity: { type: 'demonstration', scene: 'controls' },
}

/** A ordem de desenhar da `layers`: o botão da peça de CIMA a leva para baixo (lote 5 do Raio-X). */
async function trocarOrdem(vezes: number) {
  for (let i = 0; i < vezes; i++)
    fireEvent.click(await screen.findByRole('button', { name: /^Descer / }))
}

describe('a prévia de autoria', () => {
  test('⚠️ a DEMONSTRAÇÃO também registra a tentativa', async () => {
    // O registro perguntava ao avaliador da EXPERIMENTAÇÃO, que cobra as metas da cena. Quem
    // só assistiu nunca as alcança, então uma seção cujo critério fosse uma demonstração não
    // destravava no ensaio — e o professor publicaria uma aula que trava a criança.
    const tentativas: string[] = []
    // ⚠️ Mudou de propósito (lote 2 do Raio-X): "Um passo" saiu da demonstração. ⚠️ E desde os
    // consertos do review do lote 2 a parte TOCA em passos de 0,2 s com menos movimento (não salta
    // para o fim): o relógio do navegador vai na mão.
    // ⚠️ ANTES de montar: o player lê a preferência ao montar.
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    const relogio = relogioManual()
    try {
      montar(demonstracao, async (blockId) => {
        tentativas.push(blockId)
        return { participated: true, passed: true, feedback: 'ok', verifiedBy: 'client' }
      })
      const principal = () =>
        screen.getByRole('button', { name: /^Ver a parte|^Ver tudo de novo|^Pausar/ })
      await screen.findByRole('button', { name: 'Ver a parte 1' })
      for (let i = 0; i < 60 && tentativas.length === 0; i++) {
        if (principal().textContent !== 'Pausar')
          await act(async () => {
            fireEvent.click(principal())
          })
        await relogio.tocar(12)
      }
      await waitFor(() => expect(tentativas).toEqual(['preview']))
    } finally {
      relogio.restaurar()
    }
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
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): concluir a `layers` são três trocas de ordem.
    await trocarOrdem(3)
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
    await trocarOrdem(3)
    await waitFor(() => expect(tentativas).toHaveLength(1), { timeout: 5000 })
    // O que sobe é o checkpoint confirmado, não um objeto vazio.
    expect(tentativas[0]?.sceneCheckpoint).toBeDefined()
  })
})
