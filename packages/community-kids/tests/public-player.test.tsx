import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { forwardRef } from 'react'

const MockPlayer = forwardRef<HTMLIFrameElement>(function MockPlayer(_props, ref) {
  return <iframe ref={ref} title="Jogo de teste" />
})
mock.module('@sistemazero/studio/player', () => ({ StudioProjectPlayer: MockPlayer }))

const { PublicPlayer } = await import('../src/components/kids/public-player')
const originalFetch = globalThis.fetch
const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')
const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight')
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')

function restoreWindowProperty(
  name: 'innerWidth' | 'innerHeight' | 'matchMedia',
  descriptor?: PropertyDescriptor,
) {
  if (descriptor) Object.defineProperty(window, name, descriptor)
  else Reflect.deleteProperty(window, name)
}

afterEach(() => {
  globalThis.fetch = originalFetch
  restoreWindowProperty('innerWidth', originalInnerWidth)
  restoreWindowProperty('innerHeight', originalInnerHeight)
  restoreWindowProperty('matchMedia', originalMatchMedia)
})

/** Celular em pé, com tela sensível ao toque. */
function fakeCelular({ w = 393, h = 660 }: { w?: number; h?: number } = {}) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: h })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: mock(
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
    ),
  })
  globalThis.fetch = Object.assign(
    mock(async () => Response.json({ name: 'Meu primeiro jogo' })),
    { preconnect: originalFetch.preconnect },
  )
}

async function renderPlayer() {
  const view = render(<PublicPlayer id="11111111-1111-4111-8111-111111111111" />)
  await screen.findByRole('button', { name: 'Ocultar controles' })
  return view
}

function stageMessage(source: MessageEventSource | null, w: number, h: number) {
  return new MessageEvent('message', { source, data: { type: 'sz:stage', w, h } })
}

/** O happy-dom normaliza `aspect-ratio: 1.66` para a forma `1.66 / 1`. */
function aspectOf(el: Element | null): number {
  const raw = (el as HTMLElement | null)?.style.aspectRatio ?? ''
  const [width, height = '1'] = raw.split('/').map((part) => part.trim())
  return Number(width) / Number(height)
}

describe('player público', () => {
  test('a escolha manual oculta controles ativados automaticamente no mobile', async () => {
    fakeCelular()
    await renderPlayer()

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar controles' }))
    expect(screen.getByRole('button', { name: 'Mostrar controles' })).toBeTruthy()
  })

  test('esconder os controles NÃO recria o iframe: a partida continua', async () => {
    fakeCelular()
    await renderPlayer()
    const antes = screen.getByTitle('Jogo de teste')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar controles' }))
    // Mesmo ELEMENTO, não um igual: um iframe novo recarrega o jogo do zero, e
    // era o que acontecia quando cada modo tinha o seu ramo de JSX.
    expect(screen.getByTitle('Jogo de teste')).toBe(antes)

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar controles' }))
    expect(screen.getByTitle('Jogo de teste')).toBe(antes)
  })

  test('sem os controles, o palco gira para usar o lado comprido do celular', async () => {
    fakeCelular()
    const { container } = await renderPlayer()

    // Com o console na tela nada gira: ele já preenche o celular em pé.
    expect(container.querySelector('[style*="rotate(90deg)"]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar controles' }))
    expect(container.querySelector('[style*="rotate(90deg)"]')).not.toBeNull()
  })

  test('no desktop o palco nunca gira', async () => {
    fakeCelular({ w: 1440, h: 800 })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: mock(
        (query: string) =>
          ({
            matches: false,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent: () => false,
          }) satisfies MediaQueryList,
      ),
    })
    const { container } = render(<PublicPlayer id="11111111-1111-4111-8111-111111111111" />)
    await screen.findByRole('button', { name: 'Mostrar controles' })

    expect(container.querySelector('[style*="rotate(90deg)"]')).toBeNull()
  })

  test('a moldura assume a proporção que o jogo informa', async () => {
    fakeCelular()
    const { container } = await renderPlayer()
    const iframe = screen.getByTitle('Jogo de teste') as HTMLIFrameElement

    // Um jogo EM PÉ (320x480) encaixotado num palco 5:3 é o pior caso de "pouca
    // área de jogo" que existia aqui.
    act(() => {
      window.dispatchEvent(stageMessage(iframe.contentWindow, 320, 480))
    })

    const moldura = container.querySelector('[style*="aspect-ratio"]')
    expect(moldura).not.toBeNull()
    expect(aspectOf(moldura)).toBeCloseTo(320 / 480, 6)
    // E jogo em pé não gira: girar o encolheria.
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar controles' }))
    expect(container.querySelector('[style*="rotate(90deg)"]')).toBeNull()
  })

  test('ignora formato de palco que não veio do iframe do jogo', async () => {
    fakeCelular()
    const { container } = await renderPlayer()
    const antes = aspectOf(container.querySelector('[style*="aspect-ratio"]'))
    expect(antes).toBeCloseTo(5 / 3, 6)

    act(() => {
      window.dispatchEvent(stageMessage(window, 320, 480))
    })

    expect(aspectOf(container.querySelector('[style*="aspect-ratio"]'))).toBe(antes)
  })

  test('a tela cheia sobrevive a esconder os controles', async () => {
    fakeCelular()
    await renderPlayer()
    // Com o console, ela mora na barra do pé.
    expect(screen.getAllByRole('button', { name: 'Tela cheia' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar controles' }))
    // Sem o console a barra some junto, e quem esconde os controles é justamente
    // quem mais quer área de jogo: a tela cheia passa para o cabeçalho.
    expect(screen.getAllByRole('button', { name: 'Tela cheia' })).toHaveLength(1)
  })

  test('trocar o id não reaproveita o autor do jogo anterior', async () => {
    fakeCelular({ w: 1440, h: 800 })
    const responses = [
      Response.json(
        { name: 'Primeiro jogo' },
        { headers: { 'X-Author-Name': encodeURIComponent('Alice') } },
      ),
      Response.json({ name: 'Segundo jogo' }),
    ]
    globalThis.fetch = Object.assign(
      mock(async () => {
        const response = responses.shift()
        if (!response) throw new Error('Fetch inesperado')
        return response
      }),
      { preconnect: originalFetch.preconnect },
    )

    const view = render(<PublicPlayer id="11111111-1111-4111-8111-111111111111" />)
    await screen.findByText('Primeiro jogo')
    expect(screen.getByText('Alice')).toBeTruthy()

    view.rerender(<PublicPlayer id="22222222-2222-4222-8222-222222222222" />)
    await screen.findByText('Segundo jogo')

    expect(screen.queryByText('Alice')).toBeNull()
  })
})
