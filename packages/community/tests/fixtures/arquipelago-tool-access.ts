import { expect, mock, test } from 'bun:test'

let state:
  | { kind: 'unavailable' | 'readonly' }
  | {
      kind: 'ready'
      session: { id: string; role?: string; act?: object }
      access: { pinta: boolean; molda: boolean }
      journey: { capabilities: string[] }
      studioAvailable: boolean
      tier: object
      showPythonCreation: boolean
    } = { kind: 'unavailable' }
mock.module('server-only', () => ({}))
mock.module('@/server/creative-tools', () => ({ getCreativeToolsState: async () => state }))
mock.module('@/server/creator-services', () => ({
  getAdultCreatorServices: async () => ({ zappyEnabled: false }),
}))
const { GET } = await import('../../src/app/api/arquipelago/ferramentas/[ferramenta]/route')
const requisitar = (ferramenta: string) =>
  GET(new Request('http://local'), { params: Promise.resolve({ ferramenta }) })
test('respeita produto, jornada, paleta e indisponibilidade da comunidade adulta', async () => {
  expect((await requisitar('pinta')).status).toBe(503)
  expect((await requisitar('inexistente')).status).toBe(404)
  state = { kind: 'readonly' }
  expect(await (await requisitar('pinta')).json()).toEqual({ situacao: 'bloqueada' })
  state = {
    kind: 'ready',
    session: { id: 'adulto' },
    access: { pinta: true, molda: true },
    journey: { capabilities: ['pinta'] },
    studioAvailable: false,
    tier: { freeStudio: true },
    showPythonCreation: false,
  }
  expect(await (await requisitar('pinta')).json()).toEqual({
    situacao: 'disponivel',
    viewerId: 'adulto',
    studioAvailable: false,
  })
  expect(await (await requisitar('molda')).json()).toEqual({ situacao: 'bloqueada' })
  state.journey.capabilities.push('molda')
  expect(await (await requisitar('molda')).json()).toEqual({
    situacao: 'disponivel',
    viewerId: 'adulto',
    toolAccess: null,
    studioAvailable: false,
  })
  expect(await (await requisitar('estudio')).json()).toEqual({ situacao: 'bloqueada' })
  state.studioAvailable = true
  expect(await (await requisitar('estudio')).json()).toMatchObject({
    situacao: 'disponivel',
    studioConfig: { viewerId: 'adulto', tier: { freeStudio: true } },
  })
  state.session.act = { sub: 'equipe', mode: 'write' }
  expect(await (await requisitar('estudio')).json()).toEqual({ situacao: 'bloqueada' })
})
