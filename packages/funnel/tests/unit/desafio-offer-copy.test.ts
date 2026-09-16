import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DESAFIO_PRIMEIRO_JOGO } from '../../src/funnels/desafio-primeiro-jogo'

const SRC = join(import.meta.dir, '..', '..', 'src')
const source = (path: string) => readFileSync(join(SRC, ...path.split('/')), 'utf8')

describe('copy comercial do Desafio de 30 dias', () => {
  test('registro público não anuncia a nova oferta como vitalícia', () => {
    expect(DESAFIO_PRIMEIRO_JOGO.lifetimeAccess).toBe(false)
    expect(DESAFIO_PRIMEIRO_JOGO.content.copy.precoLabel).toBe('R$ 67')
    expect(DESAFIO_PRIMEIRO_JOGO.seoDescription).toContain('30 dias de acesso')
  })

  test('oferta, checkout e obrigado tornam prazo, renovação e cupom explícitos', () => {
    const offer = source('components/funnel/oferta/DesafioOfertaBody.astro')
    const checkout = source('islands/CheckoutForm.tsx')
    const thanks = source('pages/[audience]/[produto]/obrigado.astro')

    expect(offer).toContain('30 dias de acesso a partir')
    expect(offer).toContain('Pagamento único · Não é assinatura')
    expect(offer).not.toContain('R$ 97')
    expect(offer).not.toContain('Pagamento único · Acesso vitalício')
    expect(checkout).toContain('Código de palestra, escola ou clínica')
    expect(checkout).toContain('Continuar por')
    expect(checkout).toContain('Renovação automática')
    expect(thanks).toContain('Os 30 dias ainda não começaram')
    expect(thanks).toContain('computeFixedAccessExpiry')
  })
})
