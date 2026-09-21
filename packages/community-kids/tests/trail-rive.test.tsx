import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { TrailRive } from '../src/components/kids/trail-rive'

const RIV = 'https://media.example.com/admin/module-rive/nave.riv'
const OUTRO = 'https://media.example.com/admin/module-rive/asteroides.riv'

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')
const originalConnection = Object.getOwnPropertyDescriptor(navigator, 'connection')

afterEach(() => {
  cleanup()
  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia)
  else Reflect.deleteProperty(window, 'matchMedia')
  if (originalConnection) Object.defineProperty(navigator, 'connection', originalConnection)
  else Reflect.deleteProperty(navigator, 'connection')
})

/** `matchMedia` do happy-dom: o hook de movimento reduzido lê este casamento. */
function matchMedia(reduzido: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduzido && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

function economiaDeDados(ligada: boolean) {
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: { saveData: ligada },
  })
}

/**
 * ⚠️ O `IntersectionObserver` do happy-dom EXISTE mas nunca chama o callback
 * (medido) — sem o falso, o canvas nunca monta. `visivel` decide o que ele reporta;
 * o `test-setup.ts` restaura o global depois de cada teste.
 */
function observador(visivel: boolean) {
  globalThis.IntersectionObserver = class {
    constructor(private readonly avisar: IntersectionObserverCallback) {}
    observe() {
      this.avisar(
        [{ isIntersecting: visivel } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      )
    }
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return []
    }
  } as unknown as typeof IntersectionObserver
}

/** Deixa o `next/dynamic` do canvas resolver dentro do `act`. */
const assenta = () => act(async () => {})

const canvas = () => document.querySelector('[data-src]')

describe('TrailRive', () => {
  test('o HTML do servidor NUNCA tem canvas', () => {
    // Nem o canvas nem o WASM existem no servidor: montar de saída faria a
    // hidratação encontrar uma árvore diferente da que veio pronta. `render()`
    // não mede isto: ele já descarrega efeitos antes de devolver e, com o módulo
    // dinâmico aquecido por outro teste, pode legitimamente mostrar o canvas.
    matchMedia(false)
    expect(renderToString(<TrailRive src={RIV} />)).not.toContain('data-src')
  })

  test('na viewport, monta o canvas com o arquivo do módulo, tocando', async () => {
    matchMedia(false)
    observador(true)
    render(<TrailRive src={RIV} />)
    await assenta()
    expect(canvas()?.getAttribute('data-src')).toBe(RIV)
    expect(canvas()?.getAttribute('data-tocar')).toBe('true')
    expect(canvas()?.getAttribute('data-pausado')).toBe('false')
  })

  test('fora da viewport não baixa nada', async () => {
    matchMedia(false)
    observador(false)
    render(<TrailRive src={RIV} />)
    await assenta()
    expect(canvas()).toBeNull()
  })

  test('com prefers-reduced-motion a arte APARECE, parada no primeiro quadro', async () => {
    // Movimento reduzido é preferência vestibular, não falta de banda: o
    // `autoplay: false` pinta o quadro 0, então a criança continua vendo a arte.
    matchMedia(true)
    observador(true)
    render(<TrailRive src={RIV} />)
    await assenta()
    expect(canvas()?.getAttribute('data-tocar')).toBe('false')
  })

  test('na economia de dados do aparelho, nada é montado', async () => {
    matchMedia(false)
    observador(true)
    economiaDeDados(true)
    render(<TrailRive src={RIV} />)
    await assenta()
    expect(canvas()).toBeNull()
  })

  test('falha do Rive apaga a arte sem deixar buraco', async () => {
    matchMedia(false)
    observador(true)
    const { container } = render(<TrailRive src={RIV} />)
    await assenta()
    expect(canvas()).not.toBeNull()
    await act(async () => {
      ;(
        globalThis as Record<string, unknown> & { trilhaRiveFalhou?: () => void }
      ).trilhaRiveFalhou?.()
    })
    expect(canvas()).toBeNull()
    expect(container.textContent).toBe('')
  })

  test('⚠️ uma arte que falhou NÃO condena a próxima', async () => {
    // O `TrailRive` não tem `key`: sem resetar a falha na troca de `src`, o módulo
    // que recebesse arte nova seguiria vazio para sempre.
    matchMedia(false)
    observador(true)
    const { rerender } = render(<TrailRive src={RIV} />)
    await assenta()
    await act(async () => {
      ;(
        globalThis as Record<string, unknown> & { trilhaRiveFalhou?: () => void }
      ).trilhaRiveFalhou?.()
    })
    expect(canvas()).toBeNull()
    rerender(<TrailRive src={OUTRO} />)
    await assenta()
    expect(canvas()?.getAttribute('data-src')).toBe(OUTRO)
  })

  test('⚠️ trocar o .riv troca a animação (a `key` do canvas)', async () => {
    // O `useRive` lê os parâmetros UMA vez na montagem: sem a `key`, um módulo que
    // recebe arte nova seguiria rodando a antiga, sem erro nenhum.
    matchMedia(false)
    observador(true)
    const { rerender } = render(<TrailRive src={RIV} />)
    await assenta()
    expect(canvas()?.getAttribute('data-src')).toBe(RIV)
    rerender(<TrailRive src={OUTRO} />)
    await assenta()
    expect(canvas()?.getAttribute('data-src')).toBe(OUTRO)
  })
})
