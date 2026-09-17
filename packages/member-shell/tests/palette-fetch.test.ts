import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server — neutraliza p/ testar o módulo. ⚠️ O registro de
// mocks do bun é GLOBAL na suíte: o módulo é substituído por um objeto vazio para todos, que é
// exatamente o que os outros testes de server daqui já fazem.
mock.module('server-only', () => ({}))

const { fetchPaletteOnce } = await import('../src/server/palette')

/**
 * O single-flight da busca da cor.
 *
 * ⚠️⚠️ Ele não é otimização: o Turbopack separa proxy, RSC e route handlers em bundles com cópias
 * próprias do módulo, e a rajada de prefetch RSC de uma navegação chega junta. Sem ele, um perfil
 * sem espelho em cookie rendia uma ida ao gateway POR pedido em voo — e o teto da rota é 60/min
 * por principal. É o mesmo motivo (e o mesmo remédio, `globalThis` via `Symbol.for`) do
 * single-flight do refresh.
 */

const original = globalThis.fetch
let chamadas = 0
let responder: () => Promise<Response>

beforeEach(() => {
  chamadas = 0
  responder = async () => new Response(JSON.stringify({ palette: 'pink' }), { status: 200 })
  globalThis.fetch = (async () => {
    chamadas++
    return responder()
  }) as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = original
})

describe('fetchPaletteOnce', () => {
  test('⭐ pedidos concorrentes com o MESMO token viram UMA ida ao gateway', async () => {
    const token = `tok-${Math.random()}`
    const todos = await Promise.all([1, 2, 3, 4, 5].map(() => fetchPaletteOnce(token, {})))
    expect(chamadas).toBe(1)
    expect(todos).toEqual(['pink', 'pink', 'pink', 'pink', 'pink'])
  })

  test('tokens diferentes não se agrupam — são perfis diferentes', async () => {
    await Promise.all([
      fetchPaletteOnce(`a-${Math.random()}`, {}),
      fetchPaletteOnce(`b-${Math.random()}`, {}),
    ])
    expect(chamadas).toBe(2)
  })

  test('a entrada sai do mapa ao terminar — a próxima navegação pergunta de novo', async () => {
    const token = `tok-${Math.random()}`
    await fetchPaletteOnce(token, {})
    await fetchPaletteOnce(token, {})
    expect(chamadas).toBe(2)
  })

  test('⚠️ 4xx é `unavailable`, não "sem cor"', async () => {
    // Um 401/403 é a sessão ou a borda recusando. Tratar como `null` gravaria um espelho
    // mentiroso de seis horas; `unavailable` grava um curto e tenta de novo.
    responder = async () => new Response('{}', { status: 403 })
    expect(await fetchPaletteOnce(`tok-${Math.random()}`, {})).toBe('unavailable')
  })

  test('rede fora é `unavailable`, e nunca lança', async () => {
    responder = async () => {
      throw new Error('ECONNREFUSED')
    }
    expect(await fetchPaletteOnce(`tok-${Math.random()}`, {})).toBe('unavailable')
  })

  test('cor fora do catálogo vira a cor da casa, sem derrubar nada', async () => {
    responder = async () => new Response(JSON.stringify({ palette: 'roxo' }), { status: 200 })
    expect(await fetchPaletteOnce(`tok-${Math.random()}`, {})).toBeNull()
  })

  test('corpo torto também vira a cor da casa', async () => {
    responder = async () => new Response('isto não é json', { status: 200 })
    expect(await fetchPaletteOnce(`tok-${Math.random()}`, {})).toBeNull()
  })
})
