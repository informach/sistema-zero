import { expect, mock, test } from 'bun:test'

let perfil = true
let suporte = false
let journey: object | null = null
let tools: Array<{ id: string; state: string; studioCurriculum?: string }> = []
mock.module('server-only', () => ({}))
mock.module('@/server/session', () => ({
  getSession: async () =>
    perfil
      ? {
          activeProfile: { id: 'crianca' },
          id: 'crianca',
          kids: { kind: 'student' },
          ...(suporte ? { act: { sub: 'equipe', mode: 'write' } } : {}),
        }
      : null,
}))
mock.module('@/server/creator-journey', () => ({
  getCreativeTools: async () => ({ tools, journey }),
}))
mock.module('@/lib/molda-tool-access', () => ({
  moldaToolAccessFor: () => ({ allow: ['basico'] }),
}))
mock.module('@/server/members', () => ({
  getStudioUnlocksReadonly: async () => ({ status: 200, body: { blocks: [] } }),
}))
mock.module('@/server/studio-gate', () => ({
  studioGate: () => ({ kind: 'open', tier: { freeStudio: true } }),
}))
mock.module('@/server/studio-services', () => ({
  prepareStudioServices: () => async () => ({ zappyEnabled: false }),
}))
const { GET } = await import('../../src/app/api/arquipelago/ferramentas/[ferramenta]/route')
const requisitar = (ferramenta: string) =>
  GET(new Request('http://local'), { params: Promise.resolve({ ferramenta }) })

test('avatar é livre para o perfil autenticado, mas suporte não edita e resposta não usa cache', async () => {
  perfil = false
  expect((await requisitar('avatar')).status).toBe(401)
  perfil = true
  suporte = false
  tools = []
  const r = await requisitar('avatar')
  expect(await r.json()).toEqual({ situacao: 'disponivel', viewerId: 'crianca' })
  expect(r.headers.get('cache-control')).toBe('private, no-store')
  suporte = true
  expect(await (await requisitar('avatar')).json()).toEqual({ situacao: 'bloqueada' })
  suporte = false
})
test('somente perfil autenticado consulta as ferramentas', async () => {
  perfil = false
  expect((await requisitar('pinta')).status).toBe(401)
  perfil = true
  expect((await requisitar('inexistente')).status).toBe(404)
})
test('respeita conquista, produto, paleta e indisponibilidade', async () => {
  tools = [
    { id: 'pinta', state: 'available' },
    { id: 'molda', state: 'career-locked' },
    { id: 'estudio-completo', state: 'available', studioCurriculum: 'empty' },
  ]
  expect(await (await requisitar('pinta')).json()).toEqual({
    situacao: 'disponivel',
    viewerId: 'crianca',
    studioAvailable: false,
  })
  expect(await (await requisitar('molda')).json()).toEqual({ situacao: 'bloqueada' })
  tools[1]!.state = 'available'
  expect((await requisitar('molda')).status).toBe(503)
  journey = {}
  expect(await (await requisitar('molda')).json()).toEqual({
    situacao: 'disponivel',
    viewerId: 'crianca',
    toolAccess: { allow: ['basico'] },
    studioAvailable: false,
  })
  journey = null
  expect(await (await requisitar('estudio')).json()).toEqual({ situacao: 'bloqueada' })
  tools = [{ id: 'estudio-completo', state: 'available', studioCurriculum: 'ready' }]
  journey = {}
  expect(await (await requisitar('estudio')).json()).toMatchObject({
    situacao: 'disponivel',
    studioConfig: { viewerId: 'crianca', tier: { freeStudio: true } },
  })
  journey = null
  tools = [{ id: 'pinta', state: 'unavailable' }]
  expect((await requisitar('pinta')).status).toBe(503)
  suporte = true
  expect(await (await requisitar('pinta')).json()).toEqual({ situacao: 'bloqueada' })
  suporte = false
})
