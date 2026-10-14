import { expect, mock, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createPensaJourney } from '@sistemazero/core/pensa'
import type { SessionUser } from '../src/lib/types'
import type { MembersClient } from '../src/server/clients'

mock.module('server-only', () => ({}))
const { NarratableRefSchema, resolvePrivateNarration } = await import(
  '../src/routes/private-narration'
)
const projectId = randomUUID(),
  cycleId = randomUUID(),
  messageId = randomUUID()
const reference = { origin: 'pensa_message' as const, projectId, cycleId, messageId, revision: 1 }
const user = { id: randomUUID(), role: 'staff' } as SessionUser
const state = {
  ...createPensaJourney(projectId, cycleId, ''),
  messages: [
    {
      id: messageId,
      role: 'assistant' as const,
      text: 'Vamos mover seu gato.',
      revision: 1,
      final: true,
      at: '',
    },
  ],
}
const members = {
  checkPensaAccessReadonly: async () => ({ status: 200, body: { access: { pensa: true } } }),
  pensaJourneyGet: async (id: string) =>
    id === projectId ? { status: 200, body: { journey: state } } : { status: 404, body: null },
} as unknown as MembersClient
test('narrar recebe uma origem, nunca texto arbitrário do navegador', () => {
  expect(NarratableRefSchema.safeParse({ ...reference, text: 'texto inventado' }).success).toBe(
    false,
  )
  expect(NarratableRefSchema.safeParse(reference).success).toBe(true)
})
test('só narra mensagem final da revisão e do ciclo atuais', async () => {
  expect(await resolvePrivateNarration(members, user, reference)).toBe('Vamos mover seu gato.')
  expect(await resolvePrivateNarration(members, user, { ...reference, revision: 2 })).toBeNull()
  expect(
    await resolvePrivateNarration(members, user, { ...reference, cycleId: randomUUID() }),
  ).toBeNull()
  expect(
    await resolvePrivateNarration(members, user, { ...reference, projectId: randomUUID() }),
  ).toBeNull()
  state.messages[0]!.final = false
  expect(await resolvePrivateNarration(members, user, reference)).toBeNull()
  state.messages[0]!.final = true
})
test('voz do guia não confunde revisão antiga com a orientação atual', async () => {
  const source = {
    ...members,
    pensaGetTaskHandoff: async () => ({
      status: 200,
      body: {
        task: {
          revision: 3,
          guide: {
            steps: [{ id: 'a', text: 'Encaixe Mover.', hint: 'No evento da seta.' }],
            criteria: [],
          },
        },
        capability: { owned: true },
      },
    }),
  } as unknown as MembersClient
  const ref = { origin: 'pensa_guide' as const, taskId: randomUUID(), revision: 3, stepId: 'a' }
  expect(await resolvePrivateNarration(source, user, ref)).toBe(
    'Encaixe Mover.. No evento da seta.',
  )
  expect(await resolvePrivateNarration(source, user, { ...ref, revision: 2 })).toBeNull()
})
test('limpar histórico do tutor invalida a fonte e mensagens antigas podem ser encontradas', async () => {
  const source = {
    ...members,
    checkCreativeToolsAccessReadonly: async () => ({
      status: 200,
      body: { access: { 'estudio-completo': true } },
    }),
    zappyHistory: async (_id: string, cursor?: string) => ({
      status: 200,
      body: cursor
        ? {
            messages: [{ id: messageId, role: 'assistant', text: 'Use a seta.' }],
            nextCursor: null,
          }
        : { messages: [], nextCursor: 'older' },
    }),
  } as unknown as MembersClient
  const ref = { origin: 'studio_message' as const, projectId: 'studio-project', messageId }
  expect(await resolvePrivateNarration(source, user, ref)).toBe('Use a seta.')
  source.zappyHistory = async () =>
    ({ status: 200, body: { messages: [], nextCursor: null } }) as never
  expect(await resolvePrivateNarration(source, user, ref)).toBeNull()
})
