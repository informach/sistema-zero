import { expect, mock, test } from 'bun:test'
import { createPensaJourney, type PensaJourneyView } from '@sistemazero/core/pensa'
import type { MembersClient } from '../src/server/clients'

mock.module('server-only', () => ({}))
const { protectJourney } = await import('../src/server/pensa-journey/protection')
const actor = { profileId: 'child', accountId: 'parent', privileged: false }
const view: PensaJourneyView = {
  project: { id: 'project', name: 'Gato', status: 'active' },
  journey: createPensaJourney('project', 'cycle', ''),
  cycles: [],
  operation: null,
}
function fixture() {
  let revision = 1
  const calls: { type: string; id?: string }[] = []
  const members = {
    getCreationDownload: async () => ({ status: 200, body: { revision } }),
    pensaJourneyProtect: async (
      _actor: unknown,
      _id: unknown,
      action: { type: string; id: string },
    ) => {
      calls.push(action)
      return {
        status: 200,
        body:
          action.type === 'prepare'
            ? { id: action.id, files: [{ source: 'original', destination: 'private-copy' }] }
            : view,
      }
    },
  } as unknown as MembersClient
  return {
    members,
    calls,
    changeGame: () => {
      revision++
    },
  }
}
test('cópia interrompida nunca confirma checkpoint', async () => {
  const f = fixture()
  await expect(
    protectJourney(f.members, actor, view, async () => {
      throw new Error('R2 failed')
    }),
  ).rejects.toThrow('R2 failed')
  expect(f.calls.map((c) => c.type)).toEqual(['prepare'])
})
test('retry usa a mesma cópia até a revisão do jogo mudar, sem ficar preso no backup antigo', async () => {
  const f = fixture(),
    copy = mock(async () => {})
  await protectJourney(f.members, actor, view, copy)
  await protectJourney(f.members, actor, view, copy)
  f.changeGame()
  await protectJourney(f.members, actor, view, copy)
  const ids = f.calls.filter((c) => c.type === 'prepare').map((c) => c.id)
  expect(ids[0]).toBe(ids[1])
  expect(ids[1]).not.toBe(ids[2])
})
test('publicação da cópia só acontece depois de terminar o armazenamento', async () => {
  const f = fixture()
  const result = await protectJourney(f.members, actor, view, async (ticket) => {
    expect(ticket.files[0]?.destination).toBe('private-copy')
    expect(f.calls.map((c) => c.type)).toEqual(['prepare'])
  })
  expect(f.calls.map((c) => c.type)).toEqual(['prepare', 'commit'])
  expect(result).toEqual(view)
})
