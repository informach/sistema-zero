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
      const body = JSON.parse(String(init?.body))
      expect(body).toEqual({
        userId: 'user-1',
        courseRefs: ['curso-1', 'curso-2'],
        communityRefs: ['comunidade-1'],
      })
      return new Response(JSON.stringify({ grants: ['curso-1'], hasMaster: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as unknown as typeof fetch

    const gw = createMembersHttpGateway({ baseUrl: 'http://members:3004', fetchImpl })
    const res = await gw.checkAccess('user-1', ['curso-1', 'curso-2'], ['comunidade-1'])
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

  test('getShowcaseEligibility: GET com query (account/perfil/aula/bloco) + parse autoritativo', async () => {
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      const u = String(url)
      expect(u).toContain('/members/internal/showcase-eligibility')
      expect(u).toContain('accountId=conta-1')
      expect(u).toContain('userId=perfil-1')
      expect(u).toContain('lessonId=aula-1')
      expect(u).toContain('blockId=bloco-1')
      expect(init?.method).toBe('GET')
      return new Response(
        JSON.stringify({
          eligible: true,
          title: 'Meu jogo',
          summary: 'resumo',
          defaultCoverUrl: 'https://cdn/c.png',
          chain: 'cadeia-1',
          courseId: 'curso-1',
          audience: 'kids',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }) as unknown as typeof fetch
    const gw = createMembersHttpGateway({ baseUrl: 'http://members:3004', fetchImpl })
    const res = await gw.getShowcaseEligibility({
      userId: 'perfil-1',
      accountId: 'conta-1',
      lessonId: 'aula-1',
      blockId: 'bloco-1',
    })
    expect(res).toEqual({
      eligible: true,
      title: 'Meu jogo',
      summary: 'resumo',
      defaultCoverUrl: 'https://cdn/c.png',
      chain: 'cadeia-1',
      courseId: 'curso-1',
      audience: 'kids',
    })
  })

  test('getShowcaseEligibility: resposta não-ok → lança (fail-closed)', async () => {
    const fetchImpl = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch
    const gw = createMembersHttpGateway({ baseUrl: 'http://members:3004', fetchImpl })
    await expect(
      gw.getShowcaseEligibility({
        userId: 'perfil-1',
        accountId: 'conta-1',
        lessonId: 'aula-1',
        blockId: 'bloco-1',
      }),
    ).rejects.toThrow()
  })
})
