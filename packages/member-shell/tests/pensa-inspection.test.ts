import { expect, mock, test } from 'bun:test'
import { STUDIO_PARTS_FORMAT, STUDIO_PARTS_VERSION } from '@sistemazero/core/studio/project-format'
import { createEmptyProject } from '@sistemazero/studio/project'
import { documentFixture } from '../../studio/src/state/fixtures/projectDocuments'
import type { CreationDownloadTicketView } from '../src/lib/types'
import {
  PENSA_ACTOR,
  PENSA_USER,
  pensaContext,
  pensaContextMembers,
  pensaId,
} from './pensa-fixtures'

mock.module('server-only', () => ({}))
const { inspectPensaGame } = await import('../src/server/pensa/inspection')
const { loadPensaContext } = await import('../src/server/pensa/context')
const { createPensaRoutes } = await import('../src/routes/pensa')
const { createPensaClient } = await import('../src/server/pensa-client')

function ticket(): CreationDownloadTicketView {
  return {
    storageKey: 'private/authorized/game/revision-4.json.gz',
    revision: 4,
    bytes: 120,
    summary: {
      tool: 'studio',
      itemId: 'game',
      name: 'Cartas',
      kind: 'studio',
      itemUpdatedAt: '2026-10-16T12:00:00.000Z',
      revision: 4,
      bytes: 120,
      thumb: null,
      syncedAt: '2026-10-16T12:00:00.000Z',
      contentFingerprint: `v1:${'a'.repeat(64)}`,
    },
  }
}

test('inspects the saved parts manifest without downloading or reconstructing its assets', async () => {
  const project = createEmptyProject('game', 'Cartas')
  project.installedExtensions = [{ id: 'game-2d-advanced', version: '1.0.0', installedAt: 1 }]
  const manifest = {
    format: STUDIO_PARTS_FORMAT,
    version: STUDIO_PARTS_VERSION,
    program: { ...project, assets: [] },
    assets: ['a'.repeat(64)],
  }
  const keys: string[] = []
  const result = await inspectPensaGame(ticket(), 'game', async (key) => {
    keys.push(key)
    return manifest
  })
  expect(keys).toEqual([ticket().storageKey])
  expect(result.runtimeExtensionId).toBe('game-2d-advanced')
  expect(result.saveRevision).toBe('4')
  expect(result.contentFingerprint).toBe(ticket().summary.contentFingerprint ?? null)
})

test('refuses tickets for another creation before reading storage', async () => {
  const read = mock(async () => createEmptyProject('game', 'Cartas'))
  await expect(inspectPensaGame(ticket(), 'other-game', read)).rejects.toThrow('versão salva')
  expect(read).not.toHaveBeenCalled()
})

test('refuses a file whose embedded project identity disagrees with the authorized ticket', async () => {
  await expect(
    inspectPensaGame(ticket(), 'game', async () => createEmptyProject('other', 'Cartas')),
  ).rejects.toThrow('criação')
})

test('refuses an inconsistent saved revision before reading storage', async () => {
  const item = ticket()
  item.summary.revision = 5
  const read = mock(async () => createEmptyProject('game', 'Cartas'))
  await expect(inspectPensaGame(item, 'game', read)).rejects.toThrow('versão salva')
  expect(read).not.toHaveBeenCalled()
})

test('Pensa refuses an unsupported saved document permanently before view or completion', async () => {
  const context = pensaContext()
  const id = `pensa-${context.view.project.id.replaceAll('-', '')}`
  const python = { ...documentFixture('python', 'classic'), id, assets: [] }
  const saved = ticket()
  saved.summary.itemId = id
  const base = pensaContextMembers(context)
  const teamFacts = await base.pensaTeamCapabilities(PENSA_ACTOR, context.view.project.id)
  if (teamFacts.status !== 200 || !teamFacts.body) throw new Error('Missing team fixture')
  const facts = teamFacts.body
  const unexpected = async (): Promise<never> => {
    throw new Error('Unexpected upstream mutation')
  }
  const members = {
    ...createPensaClient({ gatewayFetch: unexpected, gatewayFetchHmac: unexpected }),
    ...base,
    pensaTeamCapabilities: async () => ({
      status: 200 as const,
      body: { ...facts, gameTicket: saved },
    }),
    pensaMissionContext: async () => ({
      status: 200 as const,
      body: { projectId: context.view.project.id },
    }),
    pensaProjectView: mock(unexpected),
    pensaCompleteMission: mock(unexpected),
    getAiCredits: unexpected,
    getGamification: unexpected,
  }
  let readFailure = false
  const route = createPensaRoutes({
    members,
    session: { getSession: async () => PENSA_USER },
    schedule: () => {
      throw new Error('No work may be scheduled')
    },
    loadContext: (m, user, actor, projectId, query) =>
      loadPensaContext(m, user, actor, projectId, query, async () => {
        if (readFailure) throw new Error('Storage unavailable')
        return python
      }),
  }).pensa
  for (const method of ['GET', 'POST'] as const) {
    const path =
      method === 'GET'
        ? ['projects', context.view.project.id]
        : ['missions', pensaId(42), 'complete']
    const response = await route[method](
      new Request(`https://kids.test/api/pensa/${path.join('/')}`, {
        method,
        headers: { 'x-sz-viewer': PENSA_USER.id },
        ...(method === 'POST' ? { body: '{}' } : {}),
      }),
      { params: Promise.resolve({ path }) },
    )
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ error: { code: 'PENSA_PROJECT_UNSUPPORTED' } })
  }
  expect(members.pensaProjectView).not.toHaveBeenCalled()
  expect(members.pensaCompleteMission).not.toHaveBeenCalled()
  readFailure = true
  const response = await route.GET(
    new Request(`https://kids.test/api/pensa/projects/${context.view.project.id}`, {
      headers: { 'x-sz-viewer': PENSA_USER.id },
    }),
    { params: Promise.resolve({ path: ['projects', context.view.project.id] }) },
  )
  expect(response.status).toBe(503)
  expect(await response.json()).toMatchObject({ error: { code: 'OPERATION_FAILED' } })
})

test('unsupported formats and parts receive the same permanent refusal without guessing Python', async () => {
  for (const language of ['javascript', 'python'] as const) {
    const project = { ...documentFixture(language, 'classic'), id: 'game', assets: [] }
    for (const document of [
      project,
      {
        format: STUDIO_PARTS_FORMAT,
        version: STUDIO_PARTS_VERSION,
        program: project,
        assets: [],
      },
    ]) {
      let refusal: unknown
      try {
        await inspectPensaGame(ticket(), 'game', async () => document)
      } catch (cause) {
        refusal = cause
      }
      expect(refusal).toMatchObject({
        name: 'PensaUnavailable',
        code: 'PENSA_PROJECT_UNSUPPORTED',
        status: 409,
      })
      expect(refusal instanceof Error && refusal.message.includes('Python')).toBe(false)
    }
  }
})
