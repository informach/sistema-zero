import { describe, expect, test } from 'bun:test'
import type { OfertaDoEmbaixador } from '../../src/content/embaixador'
import { FUNNELS } from '../../src/funnels/registry'
import { comLinksCurtos } from '../../src/server/ambassador-links'

const oferta = (o: Partial<OfertaDoEmbaixador>): OfertaDoEmbaixador => ({
  kind: 'referral',
  offerId: 'id',
  offerSlug: 'cade-todo-mundo-1-ano',
  name: 'Cadê',
  audience: 'kids',
  courseSlug: 'cade-todo-mundo',
  accessDays: null,
  includesMural: true,
  subscription: false,
  productSku: 'cade-todo-mundo',
  link: 'https://s.test/i/mari-x7k2/cade-todo-mundo-1-ano',
  checkoutLink: 'https://s.test/i/mari-x7k2/cade-todo-mundo-1-ano/pagamento',
  ...o,
})

describe('links curtos do painel do embaixador (25/11/2026)', () => {
  test('apelido único por público, e as oito páginas têm apelido', () => {
    for (const audience of ['kids', 'pro']) {
      const apelidos = Object.values(FUNNELS)
        .filter((f) => f.audience === audience && f.apelido)
        .map((f) => f.apelido)
      expect(new Set(apelidos).size).toBe(apelidos.length)
    }
    const todos = Object.values(FUNNELS)
      .filter((f) => f.apelido)
      .map((f) => `${f.audience}/${f.apelido}`)
      .sort()
    expect(todos).toEqual([
      'kids/cade',
      'kids/comunidade',
      'kids/desafio',
      'kids/frustracoes',
      'kids/guia',
      'pro/cade',
      'pro/comunidade',
      'pro/desafio',
    ])
  })

  test('indicação: página e pagamento pelo apelido; presente: /presente', () => {
    const [venda, presente] = comLinksCurtos([
      oferta({}),
      oferta({
        kind: 'gift',
        offerSlug: 'cade-todo-mundo-15-dias',
        link: 'https://s.test/i/mari-x7k2/cade-todo-mundo-15-dias',
        checkoutLink: null,
      }),
    ])
    expect(venda?.link).toBe('https://s.test/i/mari-x7k2/cade')
    expect(venda?.checkoutLink).toBe('https://s.test/i/mari-x7k2/cade/pagamento')
    expect(presente?.link).toBe('https://s.test/i/mari-x7k2/cade/presente')
    expect(presente?.checkoutLink).toBeNull()
  })

  test('sem apelido, produto repetido na lista ou link fora do formato: o link do referrals', () => {
    const semSku = oferta({ productSku: null })
    const outro = oferta({ productSku: 'produto-sem-pagina' })
    const torto = oferta({ link: 'nada' })
    expect(comLinksCurtos([semSku, outro])).toEqual([semSku, outro])
    expect(comLinksCurtos([torto])[0]?.link).toBe('nada')
    const repetidas = [oferta({}), oferta({ offerSlug: 'cade-6-meses' })]
    expect(comLinksCurtos(repetidas)).toEqual(repetidas)
  })
})
