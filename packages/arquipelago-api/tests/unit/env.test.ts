import { describe, expect, test } from 'bun:test'
import { loadEnv } from '../../src/infrastructure/config/env'

const base = {
  DATABASE_URL: 'postgres://x@localhost/y',
  ARQUIPELAGO_MODO: undefined,
  ARQUIPELAGO_DESAFIOS: undefined,
}

describe('env do serviço do jogo', () => {
  test('dev: aberto, só Kids, mapas ligados', () => {
    const env = loadEnv({ ...base, NODE_ENV: 'development' })
    expect(env.ARQUIPELAGO_MODO).toBe('aberto')
    expect(env.ARQUIPELAGO_DESAFIOS).toBe('aberto')
    expect(env.ARQUIPELAGO_PUBLICOS).toEqual(['kids'])
    expect(env.ARQUIPELAGO_SERVIR_MAPAS).toBe(true)
    expect(env.PORT).toBe(3015)
  })

  test('deploy sem modo explícito nasce desligado e exige o token interno', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', APP_ENV: 'staging' })).toThrow(
      /INTERNAL_API_TOKEN/,
    )
    const env = loadEnv({
      ...base,
      NODE_ENV: 'production',
      APP_ENV: 'production',
      INTERNAL_API_TOKEN: 'x'.repeat(32),
    })
    expect(env.ARQUIPELAGO_MODO).toBe('desligado')
    expect(env.ARQUIPELAGO_DESAFIOS).toBe('desligado')
    expect(env.ARQUIPELAGO_SERVIR_MAPAS).toBe(false)
  })

  test('desafios: equipe ou aberto só quando pedido; valor desconhecido recusa', () => {
    expect(loadEnv({ ...base, ARQUIPELAGO_DESAFIOS: 'equipe' }).ARQUIPELAGO_DESAFIOS).toBe('equipe')
    expect(() => loadEnv({ ...base, ARQUIPELAGO_DESAFIOS: 'todos' })).toThrow(
      /ARQUIPELAGO_DESAFIOS/,
    )
    expect(() => loadEnv({ ...base, ARQUIPELAGO_COINS_TOKEN: 'curto' })).toThrow(
      /ARQUIPELAGO_COINS_TOKEN/,
    )
  })

  test('públicos e lista em csv; público desconhecido recusa', () => {
    const env = loadEnv({
      ...base,
      ARQUIPELAGO_PUBLICOS: 'kids, Adulto',
      ARQUIPELAGO_LISTA: ' AAA ,bbb,,',
    })
    expect(env.ARQUIPELAGO_PUBLICOS).toEqual(['kids', 'adulto'])
    expect(env.ARQUIPELAGO_LISTA).toEqual(['aaa', 'bbb'])
    expect(() => loadEnv({ ...base, ARQUIPELAGO_PUBLICOS: 'todos' })).toThrow()
  })
})
