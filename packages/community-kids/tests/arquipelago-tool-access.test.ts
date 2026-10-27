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
const { GET } = await import('../src/app/api/arquipelago/ferramentas/[ferramenta]/route')
const requisitar = (ferramenta: string) =>
  GET(new Request('http://local'), { params: Promise.resolve({ ferramenta }) })
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
  expect(await (await requisitar('pinta')).json()).toEqual({ situacao: 'disponivel' })
  expect(await (await requisitar('molda')).json()).toEqual({ situacao: 'bloqueada' })
  tools[1]!.state = 'available'
  expect((await requisitar('molda')).status).toBe(503)
  journey = {}
  expect(await (await requisitar('molda')).json()).toEqual({
    situacao: 'disponivel',
    toolAccess: { allow: ['basico'] },
  })
  journey = null
  expect(await (await requisitar('estudio')).json()).toEqual({ situacao: 'bloqueada' })
  tools = [{ id: 'estudio-completo', state: 'available', studioCurriculum: 'ready' }]
  expect(await (await requisitar('estudio')).json()).toEqual({ situacao: 'disponivel' })
  tools = [{ id: 'pinta', state: 'unavailable' }]
  expect((await requisitar('pinta')).status).toBe(503)
  suporte = true
  expect(await (await requisitar('pinta')).json()).toEqual({ situacao: 'bloqueada' })
  suporte = false
})
