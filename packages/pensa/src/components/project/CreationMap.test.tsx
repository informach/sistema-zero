import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { makeCycle } from '../../testing/fakeTransport'
import { CreationMap } from './CreationMap'

function stateOf(container: HTMLElement, stage: string): string | null {
  return container.querySelector(`li[data-stage="${stage}"]`)?.getAttribute('data-state') ?? null
}

describe('CreationMap', () => {
  it('marca feito/atual/futuro conforme o ciclo (atual pulsa, futuro cadeado)', () => {
    const cycle = makeCycle({ stage: 'e', zCompletedAt: '2026-06-30T12:00:00.000Z' })
    const { container } = render(<CreationMap cycle={cycle} mode="kids" />)

    expect(stateOf(container, 'z')).toBe('done')
    expect(stateOf(container, 'e')).toBe('current')
    expect(stateOf(container, 'r')).toBe('locked')
    expect(stateOf(container, 'o')).toBe('locked')
    expect(stateOf(container, 'chest')).toBe('locked')

    // O nó atual carrega a classe de pulso (reduced-motion é tratado no CSS).
    expect(container.querySelector('li[data-stage="e"] .pz-stage-pulse')).toBeTruthy()
    expect(container.querySelector('li[data-stage="z"] .pz-stage-pulse')).toBeNull()
  })

  it('ciclo done acende os 4 nós e o baú final', () => {
    const cycle = makeCycle({
      stage: 'done',
      zCompletedAt: '2026-06-30T10:00:00.000Z',
      eCompletedAt: '2026-06-30T11:00:00.000Z',
      rCompletedAt: '2026-06-30T12:00:00.000Z',
      oCompletedAt: '2026-06-30T13:00:00.000Z',
    })
    const { container } = render(<CreationMap cycle={cycle} mode="kids" />)

    for (const stage of ['z', 'e', 'r', 'o']) {
      expect(stateOf(container, stage)).toBe('done')
    }
    expect(stateOf(container, 'chest')).toBe('done')
  })

  it('mostra os nomes kids das etapas e o rótulo do mapa', () => {
    const cycle = makeCycle()
    render(<CreationMap cycle={cycle} mode="kids" />)

    expect(screen.getByRole('list', { name: 'Mapa da criação' })).toBeTruthy()
    expect(screen.getByText('Zerar a Bagunça')).toBeTruthy()
    expect(screen.getByText('Enxergar o Jogo')).toBeTruthy()
    expect(screen.getByText('Rodar as Missões')).toBeTruthy()
    expect(screen.getByText('O Grande Lançamento')).toBeTruthy()
    expect(screen.getByText('Baú do lançamento')).toBeTruthy()
  })

  it('no mode adult usa os nomes originais', () => {
    const cycle = makeCycle()
    render(<CreationMap cycle={cycle} mode="adult" />)

    expect(screen.getByText('Zerar a Confusão')).toBeTruthy()
    expect(screen.getByText('Operar de Verdade')).toBeTruthy()
  })
})
