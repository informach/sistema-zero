import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import {
  type CanvasSpy,
  canvasEl,
  characterAt,
  installCanvasSpy,
  loadRuntime,
  startGame,
  startPlaying,
} from './kitHarness'

/**
 * Borda do palco + caixas de colisão à vista (v0.54.0).
 *
 * Dois pedidos que se encostam: a moldura de fábrica saiu do CSS e virou bloco
 * ("Mostrar a borda da tela"), e o overlay de depuração — que existia escondido
 * na crase e desenhava CÍRCULOS por `radius` em TUDO, inclusive no que colide
 * quadrado — passou a contornar a caixa REAL e ganhou bloco próprio
 * ("Mostrar as caixas de colisão"). A forma redonda por sprite (v0.55.0) tem
 * teste próprio em hitboxShape.test.ts; aqui só se confere que o overlay
 * desenha RETÂNGULO em quem é retângulo.
 */

let spy: CanvasSpy & { restore: () => void }

beforeAll(() => {
  spy = installCanvasSpy()
})

afterAll(() => {
  spy.restore()
})

beforeEach(() => {
  document.body.innerHTML = ''
  spy.clear()
})

describe('Jogo 2D Avançado — a borda do palco é ESCOLHA, não fábrica', () => {
  it('o CSS injetado não traz mais moldura no canvas', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 400, height: 300 })
    await startGame(h)

    const css = document.getElementById('szgk-style')?.textContent ?? ''
    expect(css).toContain('#szgk-canvas {')
    // A regra do canvas (até o primeiro `}`) não pode declarar borda nenhuma.
    const rule = css.slice(css.indexOf('#szgk-canvas {')).split('}')[0] ?? ''
    expect(rule).not.toContain('border')
    // E o palco nasce sem borda no elemento também.
    expect(canvasEl().style.border || '').toBe('')
  })

  it('"Mostrar a borda da tela" põe a moldura no elemento, dentro da caixa', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 400, height: 300 })
    await startGame(h)

    h.api.showStageBorder('#ff8800', 6)

    expect(canvasEl().style.border).toBe('6px solid #ff8800')
    // border-box: a moldura come da caixa, não empurra (senão vem rolagem).
    expect(canvasEl().style.boxSizing).toBe('border-box')
  })

  it('vale mesmo pedida ANTES de começar o jogo (o canvas nasce no start)', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 400, height: 300 })
    h.api.showStageBorder('#22c55e', 3)

    await startGame(h)

    expect(canvasEl().style.border).toBe('3px solid #22c55e')
  })

  it('espessura absurda é capada em 40 e valor inválido volta ao padrão', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 400, height: 300 })
    await startGame(h)

    h.api.showStageBorder('#ffffff', 9999)
    expect(canvasEl().style.border).toBe('40px solid #ffffff')

    h.api.showStageBorder('#ffffff', 0)
    expect(canvasEl().style.border).toBe('4px solid #ffffff')
  })

  // A regressão do lote: o ramo "ocupar a tela toda" zerava a borda a cada
  // redimensionamento (existia só para anular a moldura de fábrica do CSS).
  it('a borda escolhida sobrevive ao redimensionar em tela cheia', async () => {
    const h = loadRuntime()
    h.api.setupFull({})
    await startGame(h)
    h.api.showStageBorder('#e2e8f0', 8)

    h.fire('resize')

    expect(canvasEl().style.border).toBe('8px solid #e2e8f0')
  })
})

describe('Jogo 2D Avançado — "Mostrar as caixas de colisão"', () => {
  it('contorna o RETÂNGULO que colide (com o deslocamento do "só os pés"), não o círculo', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    const heroi = characterAt(h, 100, 50, 40, 60)
    h.api.setHitbox(heroi, 8, 30, 24, 30) // só os pés colidem
    h.api.showHitboxes()

    h.nextFrame(16)

    expect(spy.strokes).toContainEqual([108, 80, 24, 30])
    // Quem colide quadrado é desenhado quadrado (o overlay antigo fazia círculo
    // pelo raio em todo mundo).
    expect(spy.arcs).toEqual([])
  })

  it('mostra um personagem SEM combate (o buraco de varrer só `combatants`)', async () => {
    const h = loadRuntime()
    await startPlaying(h)

    // Personagem cru: nunca tomou dano, então não está na lista de combate.
    characterAt(h, 10, 10, 20, 20)
    h.api.showHitboxes()

    h.nextFrame(16)

    expect(spy.strokes).toContainEqual([10, 10, 20, 20])
  })

  it('sem o bloco, nada é contornado', async () => {
    const h = loadRuntime()
    await startPlaying(h)
    characterAt(h, 10, 10, 20, 20)

    h.nextFrame(16)

    expect(spy.strokes).toEqual([])
  })
})
