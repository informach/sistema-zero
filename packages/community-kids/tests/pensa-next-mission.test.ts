import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import {
  MISSION_ID,
  PROFILE_ID,
  PROJECT_ID,
  projectFixture,
} from '../../pensa/src/components/pensa.fixture'
import { navigatePensaMission, resolveNextPensaMission } from '../src/lib/pensa-next-mission'

const originalFetch = globalThis.fetch
function replaceFetch(run: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>) {
  globalThis.fetch = Object.assign(run, { preconnect: originalFetch.preconnect })
}
afterEach(() => {
  globalThis.fetch = originalFetch
})
test('a próxima missão Pro usa apenas a ação autorizada do servidor e a rota isolada', async () => {
  const view = projectFixture()
  view.studioAuthoring = 'code'
  const calls: string[] = []
  replaceFetch(async (input, init) => {
    expect(new Headers(init?.headers).get('x-sz-viewer')).toBe(PROFILE_ID)
    calls.push(String(input))
    return Response.json(view)
  })
  const next = await resolveNextPensaMission(PROJECT_ID, PROFILE_ID)
  expect(next.path).toBe(
    `/estudio/pro/pensa-${PROJECT_ID.replaceAll('-', '')}?missao=${MISSION_ID}`,
  )
  expect(calls).toEqual([`/api/pensa/projects/${PROJECT_ID}`])
})
test('esperar um colega retorna ao plano sem recalcular dependências no navegador', async () => {
  const view = projectFixture()
  view.nextAction = {
    type: 'waiting',
    missionId: MISSION_ID,
    reason: 'Bia está fazendo as cartas.',
  }
  replaceFetch(async () => Response.json(view))
  expect(await resolveNextPensaMission(PROJECT_ID, PROFILE_ID)).toEqual({
    path: `/pensa?plano=${PROJECT_ID}`,
    destination: null,
    backToPlan: true,
  })
})
test('falha na leitura não inventa outra missão', async () => {
  replaceFetch(async () => new Response('', { status: 503 }))
  await expect(resolveNextPensaMission(PROJECT_ID, PROFILE_ID)).rejects.toThrow(
    'Não consegui abrir seu caminho',
  )
})

test('trocar apenas a missão do mesmo jogo Pro conserva o documento do editor', () => {
  const originalPath = window.location.href
  const route = `/estudio/pro/pensa-${PROJECT_ID.replaceAll('-', '')}`
  window.location.href = `http://localhost${route}`
  const full = spyOn(window.location, 'assign').mockImplementation(() => {})
  const soft = mock()
  try {
    navigatePensaMission(`${route}?missao=${MISSION_ID}`, soft)
    expect(soft).toHaveBeenCalledWith(`${route}?missao=${MISSION_ID}`)
    expect(full).not.toHaveBeenCalled()
    navigatePensaMission('/estudio/pro/outro-jogo?missao=outra', soft)
    expect(full).toHaveBeenCalledWith('/estudio/pro/outro-jogo?missao=outra')
  } finally {
    full.mockRestore()
    window.location.href = originalPath
  }
})
