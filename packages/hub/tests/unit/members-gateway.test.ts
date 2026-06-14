import { describe, expect, test } from 'bun:test'
import { createMembersHttpGateway } from '../../src/infrastructure/gateways/members-http.gateway'

/**
 * Cobre o mapeamento de FIO members→hub que o fake não exercita: o members responde
 * `{ grants, hasMaster }` e o gateway converte para o `{ granted, hasMaster }` da porta.
 * Erro de fio aqui derrubaria silenciosamente todo o acesso `course_gated`.
 */
describe('members-http.gateway', () => {
  test('mapeia grants→granted e hasMaster', async () => {
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      expect(String(url)).toContain('/members/internal/access-check')
      expect(init?.method).toBe('POST')
      return new Response(JSON.stringify({ grants: ['curso-1'], hasMaster: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as unknown as typeof fetch

    const gw = createMembersHttpGateway({ baseUrl: 'http://members:3004', fetchImpl })
    const res = await gw.checkAccess('user-1', ['curso-1', 'curso-2'])
    expect(res.granted).toEqual(['curso-1'])
    expect(res.hasMaster).toBe(true)
  })

  test('grants ausente → granted vazio (tolerante), hasMaster falsy → false', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch
    const gw = createMembersHttpGateway({ baseUrl: 'http://members:3004', fetchImpl })
    const res = await gw.checkAccess('user-1', ['curso-1'])
    expect(res.granted).toEqual([])
    expect(res.hasMaster).toBe(false)
  })

  test('resposta não-ok → lança (fail-closed)', async () => {
    const fetchImpl = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch
    const gw = createMembersHttpGateway({ baseUrl: 'http://members:3004', fetchImpl })
    await expect(gw.checkAccess('user-1', ['curso-1'])).rejects.toThrow()
  })
})
