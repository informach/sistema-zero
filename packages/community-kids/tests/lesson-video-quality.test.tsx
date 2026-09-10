import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, render } from '@testing-library/react'

/**
 * Resolução do vídeo em tela cheia (09/2026).
 *
 * O Vimeo escolhe a qualidade pelo tamanho RENDERIZADO do iframe. Na aula por
 * seções o player nasce estreito (o editor divide a linha), então ele assentava
 * numa rendition baixa; e como a nossa tela cheia é do CONTAINER, e não do
 * iframe (é o que mantém o watermark visível), para o player lá dentro entrar em
 * tela cheia é só um resize: o atalho interno "tela cheia logo a melhor
 * qualidade" nunca dispara. Daí o piso + o pedido na mão.
 */
type Opcoes = Record<string, unknown>

const construidos: Opcoes[] = []
const chamadas: string[] = []
let qualidadesDisponiveis: Array<{ id: string }> = [{ id: 'auto' }, { id: '1080p' }, { id: '540p' }]
let setQualityFalha = false

const realPlayer = { ...(await import('@vimeo/player')) }

class PlayerFalso {
  constructor(_host: unknown, opcoes: Opcoes) {
    construidos.push(opcoes)
  }
  ready() {
    return Promise.resolve()
  }
  on() {}
  setCurrentTime() {
    return Promise.resolve(0)
  }
  getQualities() {
    return Promise.resolve(qualidadesDisponiveis)
  }
  setQuality(q: string) {
    chamadas.push(q)
    return setQualityFalha ? Promise.reject(new Error('conta sem o recurso')) : Promise.resolve(q)
  }
  destroy() {
    return Promise.resolve()
  }
}

mock.module('@vimeo/player', () => ({ default: PlayerFalso }))

afterAll(() => {
  mock.module('@vimeo/player', () => realPlayer)
})

const { VimeoPlayer } = await import('@sistemazero/member-shell/components/vimeo-player')

/** Finge a Fullscreen API: o jsdom/happy-dom não a implementa. */
function entrarEmTelaCheia(alvo: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', { value: alvo, configurable: true })
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'))
  })
}

beforeEach(() => {
  construidos.length = 0
  chamadas.length = 0
  setQualityFalha = false
  qualidadesDisponiveis = [{ id: 'auto' }, { id: '1080p' }, { id: '540p' }]
})

afterEach(() => {
  cleanup()
  entrarEmTelaCheia(null)
})

describe('resolução do vídeo da aula', () => {
  test('o player nasce com piso de qualidade', () => {
    render(<VimeoPlayer vimeoId="123456" />)
    expect(construidos[0]?.min_quality).toBe('540p')
  })

  test('entrar em tela cheia pede a melhor qualidade concreta, e sair devolve o automático', async () => {
    const { container } = render(<VimeoPlayer vimeoId="123456" />)
    const moldura = container.firstElementChild

    entrarEmTelaCheia(moldura)
    await Promise.resolve()
    await Promise.resolve()
    expect(chamadas).toEqual(['1080p'])

    entrarEmTelaCheia(null)
    expect(chamadas).toEqual(['1080p', 'auto'])
  })

  test('conta sem o recurso de qualidade não derruba a aula', async () => {
    setQualityFalha = true
    const { container } = render(<VimeoPlayer vimeoId="123456" />)
    entrarEmTelaCheia(container.firstElementChild)
    await Promise.resolve()
    await Promise.resolve()
    // a promessa rejeitada é engolida; o que importa é não sobrar erro nenhum
    expect(chamadas).toEqual(['1080p'])
  })
})
