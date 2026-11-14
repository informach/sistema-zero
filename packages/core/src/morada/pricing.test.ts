import { describe, expect, test } from 'bun:test'
import { MORADA_CATALOG } from './catalog.generated'
import { createMoradaHouse } from './house'
import { MORADA_PRICES } from './prices.generated'
import {
  isMoradaAdultOnly,
  isMoradaFree,
  isMoradaTrophyTier,
  MORADA_TROPHY_SHELF,
  moradaInstanceAllowed,
  moradaPieceAllowed,
  moradaPrice,
} from './pricing'

const pieces = Object.values(MORADA_CATALOG.pieces)

describe('preço das peças Morada (a régua do avatar)', () => {
  test('construção é sempre grátis', () => {
    for (const p of pieces.filter((p) => p.kind === 'construction'))
      expect(moradaPrice(p.id), p.id).toEqual({ tier: 'free', price: 0 })
  })

  test('os oito troféus e a estante de troféus são por conquista, nunca à venda', () => {
    const trofeus = pieces.filter((p) => p.tags.includes('trophy'))
    expect(trofeus).toHaveLength(8)
    expect(MORADA_CATALOG.pieces[MORADA_TROPHY_SHELF]?.slots.length).toBeGreaterThan(0)
    for (const id of [...trofeus.map((p) => p.id), MORADA_TROPHY_SHELF]) {
      expect(isMoradaTrophyTier(id), id).toBe(true)
      expect(moradaPrice(id).price).toBe(0)
      expect(MORADA_PRICES[id], id).toBeUndefined()
    }
  })

  test('a casa inicial é toda grátis (ninguém começa devendo)', () => {
    for (const i of createMoradaHouse().instances)
      expect(isMoradaFree(i.pieceId), i.pieceId).toBe(true)
  })

  test('toda categoria de móvel tem jeito grátis e tem peça paga', () => {
    const porCategoria = new Map<string, { gratis: number; pagas: number }>()
    for (const p of pieces.filter((p) => p.kind === 'furniture' && !isMoradaTrophyTier(p.id))) {
      const c = porCategoria.get(p.category) ?? { gratis: 0, pagas: 0 }
      if (isMoradaFree(p.id)) c.gratis += 1
      else c.pagas += 1
      porCategoria.set(p.category, c)
    }
    for (const [categoria, c] of porCategoria) {
      expect(c.gratis, categoria).toBeGreaterThan(0)
      expect(c.pagas, categoria).toBeGreaterThan(0)
    }
  })

  test('os preços pagos ficam nas faixas do quarto antigo (30 a 300) e redondos', () => {
    for (const [id, p] of Object.entries(MORADA_PRICES)) {
      expect(MORADA_CATALOG.pieces[id], id).toBeDefined()
      if (p.tier !== 'coins') continue
      expect(p.price, id).toBeGreaterThanOrEqual(30)
      expect(p.price, id).toBeLessThanOrEqual(300)
      expect(p.price % 10, id).toBe(0)
    }
  })

  test('as peças de cassino são só do adulto (e pagas)', () => {
    for (const id of [
      'moveis/livros/livro_cassino_pacote',
      'moveis/luminarias/letreiro_neon_cassino_pacote',
    ]) {
      expect(isMoradaAdultOnly(id), id).toBe(true)
      expect(moradaPrice(id).tier, id).toBe('coins')
    }
    expect(Object.values(MORADA_PRICES).every((p) => !p.review)).toBe(true)
  })

  test('peça desconhecida não é permitida; grátis é; paga só com posse', () => {
    const paga = Object.keys(MORADA_PRICES).find((id) => MORADA_PRICES[id]?.tier === 'coins')
    const gratis = Object.keys(MORADA_PRICES).find((id) => MORADA_PRICES[id]?.tier === 'free')
    if (!paga || !gratis) throw new Error('sem peça paga ou grátis')
    expect(moradaPieceAllowed('moveis/nao/existe', [paga])).toBe(false)
    expect(moradaPieceAllowed(gratis, [])).toBe(true)
    expect(moradaPieceAllowed(paga, [])).toBe(false)
    expect(moradaPieceAllowed(paga, [paga])).toBe(true)
    expect(moradaPieceAllowed(paga, new Set([paga]))).toBe(true)
    expect(moradaPieceAllowed(MORADA_TROPHY_SHELF, [])).toBe(false)
    expect(moradaPieceAllowed(MORADA_TROPHY_SHELF, [MORADA_TROPHY_SHELF])).toBe(true)
  })

  test('a função do jogo (behavior objeto:) vem da conquista no jogo, não da loja', () => {
    const paga = Object.keys(MORADA_PRICES).find((id) => MORADA_PRICES[id]?.tier === 'coins')
    if (!paga) throw new Error('sem peça paga')
    expect(moradaInstanceAllowed({ pieceId: paga, behavior: 'objeto:geladeira' }, [])).toBe(true)
    expect(moradaInstanceAllowed({ pieceId: paga }, [])).toBe(false)
    // Troféu continua pedindo a conquista mesmo com um behavior.
    expect(
      moradaInstanceAllowed({ pieceId: 'trophy/trofeu-chama', behavior: 'objeto:museu' }, []),
    ).toBe(false)
  })
})
