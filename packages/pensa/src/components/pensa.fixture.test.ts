import { expect, test } from 'bun:test'
import { type PensaProjectView, validatePensaPlan } from '@sistemazero/core/pensa'
import { createProjectServer, demoProject } from '../../playground/project-server'
import { projectFixture } from './pensa.fixture'

test('accepted fixtures satisfy the full domain plan, including resources for every mission', () => {
  for (const view of [projectFixture(), demoProject()]) {
    if (!view.revision) throw new Error('Missing accepted fixture')
    const result = validatePensaPlan({ ...view.revision, accepted: true })
    expect(result.issues).toEqual([])
    expect(result.ok).toBe(true)
  }
})

test('new playground games have independent mission identities and valid drafts', async () => {
  const server = createProjectServer(true)
  const first = await server.request<PensaProjectView>('/projects', {
    method: 'POST',
    body: { message: 'Meu jogo' },
  })
  const second = await server.request<PensaProjectView>('/projects', {
    method: 'POST',
    body: { message: 'Outro jogo' },
  })
  expect(first.project.id).not.toBe(second.project.id)
  expect(first.draft?.plan?.missions[0]?.id).not.toBe(second.draft?.plan?.missions[0]?.id)
  for (const view of [first, second]) {
    const draft = view.draft
    if (!draft?.definition || !draft.plan || !draft.technical) throw new Error('Missing draft')
    expect(
      validatePensaPlan({
        definition: draft.definition,
        plan: draft.plan,
        technical: draft.technical,
      }).issues,
    ).toEqual([])
  }
})
