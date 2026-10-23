import { expect, test } from 'bun:test'
import { handoffFixture, PROFILE_ID } from '../../pensa/src/components/pensa.fixture'
import { linkStudioMission } from '../src/lib/pensa-mission-link'

test('iniciar envia as revisões canônicas sem simular evidência salva', async () => {
  const handoff = handoffFixture()
  let sent: unknown
  const next = await linkStudioMission({
    handoff,
    viewerId: PROFILE_ID,
    fetch: async (_url, init) => {
      expect(new Headers(init.headers).get('x-sz-viewer')).toBe(PROFILE_ID)
      sent = JSON.parse(String(init.body))
      return Response.json({
        ...handoff,
        progress: { ...handoff.progress, status: 'in_progress', progressRevision: 1 },
      })
    },
  })
  expect(sent).toMatchObject({
    baseRevisionId: handoff.projectRevisionId,
    contentRevision: handoff.mission.contentRevision,
    expectedProgressRevision: 0,
  })
  expect(sent).not.toHaveProperty('deliveries')
  expect(next.progress.status).toBe('in_progress')
})
test('abrir missão concluída não inicia novamente', async () => {
  const handoff = handoffFixture()
  handoff.progress.status = 'completed'
  let writes = 0
  await linkStudioMission({
    handoff,
    viewerId: PROFILE_ID,
    fetch: async () => {
      writes += 1
      return Response.json(handoff)
    },
  })
  expect(writes).toBe(0)
})
