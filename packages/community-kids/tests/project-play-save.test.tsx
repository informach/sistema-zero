import { afterEach, describe, expect, test } from 'bun:test'
import type { InteractiveBlock, LearningResult } from '@sistemazero/core/learning'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import {
  type LessonPreviewContextValue,
  LessonPreviewProvider,
} from '@sistemazero/member-shell/components/lesson-preview-context'
import { createEmptyProject } from '@sistemazero/studio/project'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

/**
 * O jogo pronto ao se guardar (04/10/2026): nada pode entrar nem sair embaixo do jogo durante a
 * espera do servidor (o botão "Tentar guardar descoberta" fazia a tela tremer), e o "tentar de
 * novo" de uma tentativa que FALHOU mora dentro da linha de status, que tem altura reservada.
 * O deslocamento em si é medido no Chromium (`e2e-scenes/project-play-save.spec.ts`).
 */
const project = createEmptyProject('participacao', 'Jogo de participação')
project.mode = 'code'
project.files = {
  'index.html': '<button type="button">Jogar</button>',
  'style.css': '',
  'script.js': '',
}

const content: InteractiveBlock = {
  kind: 'interactive',
  title: 'Jogue o jogo pronto',
  instructions: 'Toque no jogo.',
  hints: [],
  required: true,
  activity: {
    type: 'project-play',
    completion: 'participation',
    project,
    stage: { width: 640, height: 360 },
    targets: [],
  },
}

const aprovado: LearningResult = {
  participated: true,
  passed: true,
  feedback: 'Você jogou!',
  verifiedBy: 'client',
}

function montar(onAttempt: LessonPreviewContextValue['onAttempt']) {
  const ensaio: LessonPreviewContextValue = {
    // O jogo já concluído: a tentativa automática começa sozinha.
    answers: { jogo: { participated: true } },
    hintsUsed: {},
    results: {},
    workspaces: {},
    onWorkspaceChange: () => {},
    onProjectCheck: async () => '',
    onChange: () => {},
    onAttempt,
    onQuiz: async () => {},
  }
  return render(
    <LessonPreviewProvider value={ensaio}>
      <InteractiveLessonBlock
        block={{ id: 'jogo', kind: 'interactive', sortOrder: 0, content }}
        previewContent={content}
      />
    </LessonPreviewProvider>,
  )
}

/** Tudo o que existe DEPOIS do palco, dentro do cartão do jogo. */
function abaixoDoJogo() {
  const fieldset = document.querySelector('.sz-project-play-card fieldset')
  if (!fieldset) throw new Error('o corpo do jogo não apareceu')
  return fieldset
}

afterEach(cleanup)

describe('guardar o jogo pronto', () => {
  test('durante a espera não entra nenhum botão embaixo do jogo, e o bloco não apaga', async () => {
    let responder: (r: LearningResult) => void = () => {}
    montar(() => new Promise((resolve) => (responder = resolve)))
    await act(async () => {})
    const corpo = abaixoDoJogo()
    // A tentativa está em andamento: nada de botão, e nada desligado (o `fieldset` desligado
    // piscava a pista).
    expect(corpo.querySelectorAll('button')).toHaveLength(0)
    expect(corpo.hasAttribute('disabled')).toBe(false)
    // Só a linha de status, que já tinha a altura reservada.
    expect(corpo.children).toHaveLength(1)
    expect(corpo.firstElementChild?.className).toContain('min-h-5')
    await act(async () => responder(aprovado))
    expect(corpo.querySelectorAll('button')).toHaveLength(0)
    expect(corpo.children).toHaveLength(1)
  })

  test('a tentativa que FALHA oferece tentar de novo dentro da linha de status', async () => {
    let chamadas = 0
    montar(async () => {
      chamadas += 1
      if (chamadas === 1) throw new Error('Sem conexão.')
      return aprovado
    })
    await act(async () => {})
    const corpo = abaixoDoJogo()
    const alerta = screen.getByRole('alert')
    expect(alerta.textContent).toContain('Sem conexão.')
    // A mesma caixa de antes, com a altura reservada: nenhuma linha nova embaixo do jogo.
    expect(corpo.children).toHaveLength(1)
    expect(alerta.className).toContain('min-h-5')
    expect(screen.queryByRole('button', { name: 'Tentar guardar descoberta' })).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tentar salvar novamente' }))
    })
    // O "tentar de novo" do jogo refaz a TENTATIVA (não só regrava as respostas).
    expect(chamadas).toBe(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('a tentativa que volta sem guardar oferece o link na mesma linha', async () => {
    montar(async () => ({ ...aprovado, passed: false, feedback: 'Ainda falta jogar.' }))
    await act(async () => {})
    const link = screen.getByRole('button', { name: 'Tentar guardar de novo' })
    expect(link.closest('p')?.getAttribute('role')).toBe('status')
    expect(link.closest('p')?.className).toContain('min-h-5')
  })
})
