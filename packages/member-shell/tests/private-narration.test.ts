import { expect, mock, test } from 'bun:test'
import { PensaProjectRevisionSchema } from '@sistemazero/core/pensa'
import {
  PENSA_DATE,
  PENSA_USER,
  pensaContext,
  pensaDefinition,
  pensaId,
  pensaNarrationMembers,
} from './pensa-fixtures'

mock.module('server-only', () => ({}))
const { NarratableRefSchema, resolvePrivateNarration } = await import(
  '../src/routes/private-narration'
)
const privileged = { ...PENSA_USER, role: 'staff' }

test('narration only accepts a canonical reference and the current assistant message revision', async () => {
  const context = pensaContext()
  context.view.messages.push({
    ...context.view.messages[0]!,
    id: pensaId(30),
    role: 'assistant',
    text: 'Vamos organizar as cartas.',
    revision: 2,
  })
  const members = pensaNarrationMembers(context)
  const ref = {
    origin: 'pensa_message' as const,
    projectId: context.view.project.id,
    messageId: pensaId(30),
    messageRevision: 2,
  }
  const load = async () => context
  expect(NarratableRefSchema.safeParse({ ...ref, text: 'arbitrary browser text' }).success).toBe(
    false,
  )
  expect(await resolvePrivateNarration(members, privileged, ref, load)).toBe(
    'Vamos organizar as cartas.',
  )
  expect(
    await resolvePrivateNarration(members, privileged, { ...ref, messageRevision: 1 }, load),
  ).toBeNull()
  context.view.messages.pop()
  expect(await resolvePrivateNarration(members, privileged, ref, load)).toBeNull()
})

test('mission narration uses functional rules and refuses an obsolete content revision', async () => {
  const context = pensaContext()
  context.view.revision = PensaProjectRevisionSchema.parse({
    id: pensaId(40),
    projectId: context.view.project.id,
    number: 1,
    previousRevisionId: null,
    acceptedByProfileId: privileged.id,
    acceptedAt: PENSA_DATE,
    definition: pensaDefinition(),
    plan: {
      stages: [{ id: pensaId(41), title: 'Cartas', position: 0 }],
      missions: [
        {
          id: pensaId(42),
          stageId: pensaId(41),
          position: 0,
          contentRevision: 3,
          kind: 'feature',
          destination: 'studio',
          title: 'Escolha duas cartas',
          objective: 'Permita escolher duas cartas diferentes.',
          requirementIds: [pensaId(11)],
          dependencyIds: [],
          rules: [{ id: 'two', text: 'Somente duas cartas diferentes podem ficar abertas.' }],
          checks: [
            {
              id: 'same',
              action: 'Escolha a mesma carta duas vezes.',
              expected: 'A carta conta somente uma vez.',
            },
          ],
        },
      ],
    },
    technical: {
      capabilitiesFingerprint: context.capabilities.fingerprint,
      catalogVersion: context.capabilities.catalogVersion,
      authoring: 'blocks',
      runtimeExtensionId: 'game-2d-advanced',
      extensions: [],
      missionResources: [],
      references: [],
    },
  })
  const members = pensaNarrationMembers(context)
  const ref = {
    origin: 'pensa_mission' as const,
    missionId: pensaId(42),
    contentRevision: 3,
    section: 'rule' as const,
    itemId: 'two',
  }
  expect(await resolvePrivateNarration(members, privileged, ref, async () => context)).toContain(
    'Somente duas cartas',
  )
  expect(
    await resolvePrivateNarration(
      members,
      privileged,
      { ...ref, contentRevision: 2 },
      async () => context,
    ),
  ).toBeNull()
})

test('clearing the Studio tutor history invalidates its source, including older pages', async () => {
  const members = pensaNarrationMembers()
  members.zappyHistory = async (_id, cursor) => ({
    status: 200,
    body: cursor
      ? {
          messages: [
            {
              id: pensaId(50),
              role: 'assistant',
              text: 'Confira o resultado.',
              createdAt: PENSA_DATE,
            },
          ],
          nextCursor: null,
        }
      : { messages: [], nextCursor: 'older' },
  })
  const ref = {
    origin: 'studio_message' as const,
    projectId: 'studio-project',
    messageId: pensaId(50),
  }
  expect(await resolvePrivateNarration(members, privileged, ref)).toBe('Confira o resultado.')
  members.zappyHistory = async () => ({ status: 200, body: { messages: [], nextCursor: null } })
  expect(await resolvePrivateNarration(members, privileged, ref)).toBeNull()
})
