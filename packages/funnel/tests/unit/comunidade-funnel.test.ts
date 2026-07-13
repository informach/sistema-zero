import { describe, expect, test } from 'bun:test'
import { COMUNIDADE_DOS_CRIADORES } from '../../src/funnels/comunidade-dos-criadores'
import { COMUNIDADE_PRECO_FALLBACK } from '../../src/funnels/comunidade-dos-criadores/content'
import { FUNNELS, getFunnel, getFunnelByKey, isFunnelKey } from '../../src/funnels/registry'

// Funil de ASSINATURA sem quiz: o def precisa manter os invariantes que dirigem
// os 404 (quiz/resultado), o dispatch do body próprio (sem `sales`) e o rodapé
// sem o disclaimer de vitalício.
describe('registro do funil Comunidade dos Criadores', () => {
  test('resolve pela URL e pela chave', () => {
    expect(getFunnel('kids', 'comunidade-dos-criadores')).toBe(COMUNIDADE_DOS_CRIADORES)
    expect(getFunnelByKey('kids/comunidade-dos-criadores')).toBe(COMUNIDADE_DOS_CRIADORES)
    expect(isFunnelKey('kids/comunidade-dos-criadores')).toBe(true)
  })

  test('def coerente: kids, assinatura, sem quiz e com body próprio', () => {
    const f = COMUNIDADE_DOS_CRIADORES
    expect(f.key).toBe('kids/comunidade-dos-criadores')
    expect(f.basePath).toBe('/kids/comunidade-dos-criadores')
    expect(f.audience).toBe('kids')
    expect(f.theme).toBe('kids')
    // Assinatura: o Footer NÃO deve exibir o disclaimer de acesso vitalício.
    expect(f.lifetimeAccess).toBe(false)
    // Sem quiz/resultado/upsell/downsell: as rotas dão 404 sozinhas.
    expect(f.steps).toEqual({ quiz: false, resultado: false, upsell: false, downsell: false })
    expect(f.content.quiz).toBeUndefined()
    expect(f.content.hero).toBeUndefined()
    expect(f.content.result).toBeUndefined()
    // Sem `sales`: a /oferta despacha o ComunidadeOfertaBody pela chave.
    expect(f.content.sales).toBeUndefined()
    // Capa dedicada do checkout/og.
    expect(f.checkoutImage).toBe('checkout-capa.webp')
    expect(f.imagesBase).toBe('/img/comunidade-dos-criadores')
  })

  test('obrigado tem intro de assinatura, entrega e passos completos', () => {
    const o = COMUNIDADE_DOS_CRIADORES.content.obrigado
    expect(o.intro?.length).toBeGreaterThan(0)
    expect(o.entrega.length).toBeGreaterThanOrEqual(6)
    expect(o.passos.length).toBeGreaterThanOrEqual(3)
    for (const p of o.passos) {
      expect(p.titulo.length).toBeGreaterThan(0)
      expect(p.texto.length).toBeGreaterThan(0)
    }
  })

  test('fallback de preço próprio da página (o da rota é o do NCI)', () => {
    expect(COMUNIDADE_PRECO_FALLBACK.mensalCents).toBe(9_700)
    expect(COMUNIDADE_PRECO_FALLBACK.anualCents).toBe(79_700)
  })

  test('ordem de registro: o 1º funil kids do map segue sendo o Desafio (/kids redireciona pra ele)', () => {
    const kids = Object.values(FUNNELS).filter((f) => f.audience === 'kids')
    expect(kids[0]?.key).toBe('kids/desafio-primeiro-jogo')
    expect(kids.map((f) => f.key)).toContain('kids/comunidade-dos-criadores')
  })
})
