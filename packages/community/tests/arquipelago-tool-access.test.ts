import { expect, mock, test } from 'bun:test'

let state:
  | { kind: 'unavailable' | 'readonly' }
  | {
      kind: 'ready'
      session: { act?: object }
      access: { pinta: boolean; molda: boolean }
      journey: { capabilities: string[] }
      studioAvailable: boolean
    } = { kind: 'unavailable' }
mock.module('server-only', () => ({}))
mock.module('@/server/creative-tools', () => ({ getCreativeToolsState: async () => state }))
const { GET } = await import('../src/app/api/arquipelago/ferramentas/[ferramenta]/route')
const requisitar = (ferramenta: string) =>
  GET(new Request('http://local'), { params: Promise.resolve({ ferramenta }) })
test('respeita produto, jornada, paleta e indisponibilidade da comunidade adulta', async () => {
  expect((await requisitar('pinta')).status).toBe(503)
  expect((await requisitar('inexistente')).status).toBe(404)
  state = { kind: 'readonly' }
  expect(await (await requisitar('pinta')).json()).toEqual({ situacao: 'bloqueada' })
  state = {
    kind: 'ready',
    session: {},
    access: { pinta: true, molda: true },
    journey: { capabilities: ['pinta'] },
    studioAvailable: false,
  }
  expect(await (await requisitar('pinta')).json()).toEqual({ situacao: 'disponivel' })
  expect(await (await requisitar('molda')).json()).toEqual({ situacao: 'bloqueada' })
  state.journey.capabilities.push('molda')
  expect(await (await requisitar('molda')).json()).toEqual({
    situacao: 'disponivel',
    toolAccess: null,
  })
  expect(await (await requisitar('estudio')).json()).toEqual({ situacao: 'bloqueada' })
  state.studioAvailable = true
  expect(await (await requisitar('estudio')).json()).toEqual({ situacao: 'disponivel' })
  state.session.act = { sub: 'equipe', mode: 'write' }
  expect(await (await requisitar('estudio')).json()).toEqual({ situacao: 'bloqueada' })
})
