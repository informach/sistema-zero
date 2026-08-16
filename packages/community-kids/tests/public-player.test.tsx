import { afterEach, describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { forwardRef } from 'react'

const MockPlayer = forwardRef<HTMLIFrameElement>(function MockPlayer() {
  return <iframe title="Jogo de teste" />
})
mock.module('@sistemazero/studio/player', () => ({ StudioProjectPlayer: MockPlayer }))

const { PublicPlayer } = await import('../src/components/kids/public-player')
const originalFetch = globalThis.fetch
const originalInnerWidth = window.innerWidth

afterEach(() => {
  globalThis.fetch = originalFetch
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
})

describe('player público', () => {
  test('a escolha manual oculta controles ativados automaticamente no mobile', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    window.matchMedia = mock(
      (query: string) =>
        ({
          matches: query === '(pointer: coarse)',
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent: () => false,
        }) satisfies MediaQueryList,
    )
    globalThis.fetch = Object.assign(
      mock(async () => Response.json({ name: 'Meu primeiro jogo' })),
      { preconnect: originalFetch.preconnect },
    )

    render(<PublicPlayer id="11111111-1111-4111-8111-111111111111" />)

    const hide = await screen.findByRole('button', { name: 'Ocultar controles' })
    fireEvent.click(hide)
    expect(screen.getByRole('button', { name: 'Mostrar controles' })).toBeTruthy()
  })
})
