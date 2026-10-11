import { describe, expect, test } from 'bun:test'
import { useLessonDraftState } from '@sistemazero/member-shell/components/lesson-draft-status'
import type {
  LessonDraftChannel,
  LessonDraftState,
} from '@sistemazero/member-shell/lib/lesson-draft-cloud'
import { act, render, screen } from '@testing-library/react'

/** Um canal de mentira: um estado por bloco e a lista de quem está ouvindo. */
function canal(inicial: Record<string, LessonDraftState>) {
  const estados = { ...inicial }
  const ouvintes = new Set<() => void>()
  const channel = {
    getState: (blockId: string) => estados[blockId] ?? { status: 'idle', message: null },
    subscribe: (listener: () => void) => {
      ouvintes.add(listener)
      return () => ouvintes.delete(listener)
    },
  } as unknown as LessonDraftChannel
  return {
    channel,
    ouvintes,
    mudar(blockId: string, estado: LessonDraftState) {
      estados[blockId] = estado
      for (const ouvinte of ouvintes) ouvinte()
    },
  }
}

function Selo({ channel, blockId }: { channel: LessonDraftChannel; blockId: string }) {
  const state = useLessonDraftState(channel, blockId)
  return <p data-testid={blockId}>{state?.status ?? 'nada'}</p>
}

/**
 * O selo é do BLOCO (11/10/2026): antes a pílula mostrava a fila da ferramenta inteira, e o erro
 * de um bloco pintava o selo do vizinho. O hook relê só o seu bloco a cada aviso e desliga ao sair.
 */
describe('useLessonDraftState', () => {
  test('cada bloco lê o próprio estado, e o aviso do vizinho não o muda', () => {
    const fila = canal({
      a: { status: 'saved', message: null },
      b: { status: 'saved', message: null },
    })
    render(
      <>
        <Selo channel={fila.channel} blockId="a" />
        <Selo channel={fila.channel} blockId="b" />
      </>,
    )
    act(() => fila.mudar('b', { status: 'error', message: 'falhou' }))
    expect(screen.getByTestId('a').textContent).toBe('saved')
    expect(screen.getByTestId('b').textContent).toBe('error')
  })

  test('desmontar e trocar de bloco desligam o ouvinte antigo', () => {
    const fila = canal({ a: { status: 'saving', message: null } })
    const view = render(<Selo channel={fila.channel} blockId="a" />)
    expect(fila.ouvintes.size).toBe(1)
    view.rerender(<Selo channel={fila.channel} blockId="c" />)
    expect(fila.ouvintes.size).toBe(1)
    expect(screen.getByTestId('c').textContent).toBe('idle')
    view.unmount()
    expect(fila.ouvintes.size).toBe(0)
  })
})
