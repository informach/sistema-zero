import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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
    expect(o.entrega.join(' ')).toContain('Desafio do Primeiro Jogo')
    expect(o.entrega.join(' ')).toContain('Estúdio, Pinta, Pensa e Molda')
    expect(o.entrega.join(' ')).toContain('Até 2 perfis de criança')
    expect(o.passos.map((p) => p.titulo)).toContain('Mostre a Jornada do Criador')
  })

  test('metadados apresentam tecnologia como contexto e criação como possibilidade', () => {
    const f = COMUNIDADE_DOS_CRIADORES
    expect(f.content.landing.h1).toContain('mundo tecnológico')
    expect(f.content.landing.h1).toContain('transformar ideias em jogos')
    expect(f.seoTitle).toContain('Tecnologia para criar jogos')
    expect(f.seoDescription).toContain('criarem e publicarem jogos')
    expect(f.seoDescription).not.toContain('parte do tempo digital')
  })

  test('checkout de assinatura mantém a copy pública sem travessão', () => {
    const card = readFileSync(
      join(import.meta.dir, '..', '..', 'src', 'islands', 'CardCheckout.tsx'),
      'utf8',
    )
    const publicRenewalCopy = card.slice(
      card.indexOf('Renovação automática no cartão.'),
      card.indexOf('{!contact'),
    )

    expect(publicRenewalCopy).toContain('Cancele quando quiser. O acesso continua')
    expect(publicRenewalCopy).not.toContain('—')
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
