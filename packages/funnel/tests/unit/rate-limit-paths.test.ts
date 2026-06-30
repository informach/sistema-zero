import { describe, expect, test } from 'bun:test'
import { isRateLimitedGetPath } from '../../src/lib/rate-limit-paths'

describe('isRateLimitedGetPath', () => {
  test('cobre GETs que tocam banco/gateway nas rotas legadas e multi-funil', () => {
    expect(isRateLimitedGetPath('/checkout')).toBe(true)
    expect(isRateLimitedGetPath('/resultado')).toBe(true)
    expect(isRateLimitedGetPath('/oferta')).toBe(true)
    expect(isRateLimitedGetPath('/pro/no-comando-da-ia/checkout')).toBe(true)
    expect(isRateLimitedGetPath('/pro/no-comando-da-ia/resultado')).toBe(true)
    expect(isRateLimitedGetPath('/pro/no-comando-da-ia/oferta')).toBe(true)
    expect(isRateLimitedGetPath('/kids/estudio-completo/checkout')).toBe(true)
    expect(isRateLimitedGetPath('/kids/estudio-completo/resultado')).toBe(true)
    expect(isRateLimitedGetPath('/kids/estudio-completo/oferta')).toBe(true)
  })

  test('mantem admin e APIs sensiveis no teto de GET', () => {
    expect(isRateLimitedGetPath('/admin')).toBe(true)
    expect(isRateLimitedGetPath('/admin/login')).toBe(true)
    expect(isRateLimitedGetPath('/api/admin/leads')).toBe(true)
    expect(isRateLimitedGetPath('/api/checkout/pay-1')).toBe(true)
    expect(isRateLimitedGetPath('/api/leads')).toBe(true)
  })

  test('nao limita paginas publicas que nao escrevem nem chamam gateway', () => {
    expect(isRateLimitedGetPath('/pro/no-comando-da-ia/quiz')).toBe(false)
    expect(isRateLimitedGetPath('/politica-de-privacidade')).toBe(false)
    expect(isRateLimitedGetPath('/api/events')).toBe(false)
  })
})
