import { expect, mock, test } from 'bun:test'
import { STUDIO_PARTS_FORMAT, STUDIO_PARTS_VERSION } from '@sistemazero/core/studio/project-format'
import { createEmptyProject } from '@sistemazero/studio/project'
import type { CreationDownloadTicketView } from '../src/lib/types'

mock.module('server-only', () => ({}))
const { inspectPensaGame } = await import('../src/server/pensa/inspection')

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
