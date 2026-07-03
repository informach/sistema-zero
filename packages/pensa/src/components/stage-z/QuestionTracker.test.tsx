import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { makeZState } from '../../testing/fakeTransport'
import { QuestionTracker } from './QuestionTracker'

function litOf(container: HTMLElement, question: string): string | null {
  return container.querySelector(`[data-question="${question}"]`)?.getAttribute('data-lit') ?? null
}

describe('QuestionTracker', () => {
  it('sem estado (etapa recém-aberta) nenhuma estrela acende', () => {
    const { container } = render(<QuestionTracker zState={null} mode="kids" />)

    for (const question of ['who', 'problem', 'action', 'screens', 'success']) {
      expect(litOf(container, question)).toBe('false')
    }
    expect(screen.getByRole('img', { name: '0 de 5 perguntas respondidas' })).toBeTruthy()
  })

  it('acende as estrelas conforme o answered e descreve o progresso', () => {
    const zState = makeZState({ answered: { who: true, problem: true, action: true } })
    const { container } = render(<QuestionTracker zState={zState} mode="kids" />)

    expect(litOf(container, 'who')).toBe('true')
    expect(litOf(container, 'problem')).toBe('true')
    expect(litOf(container, 'action')).toBe('true')
    expect(litOf(container, 'screens')).toBe('false')
    expect(litOf(container, 'success')).toBe('false')
    expect(screen.getByRole('img', { name: '3 de 5 perguntas respondidas' })).toBeTruthy()

    // Estrela acesa carrega o pop (reduced-motion é tratado no pensa.css).
    expect(container.querySelector('[data-question="who"] .pz-star-pop')).toBeTruthy()
    expect(container.querySelector('[data-question="screens"] .pz-star-pop')).toBeNull()
  })

  it('mostra os rótulos curtos das 5 perguntas', () => {
    render(<QuestionTracker zState={makeZState()} mode="kids" />)

    for (const label of ['Quem?', 'Diversão', 'Ação', 'Telas', 'Ficou bom']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
  })
})
