import { expect, test } from 'bun:test'
import { type InteractiveBlock, isInteractiveBlock } from '@sistemazero/core/learning'
import { Elysia, t } from 'elysia'
import manifest from '../../../../docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.manifesto.json'
import { InteractiveBlockSchema } from '../../src/interfaces/http/learning.dtos'
import {
  draftCommand,
  parsePublishedLessonBlock,
} from '../../src/interfaces/http/lesson-draft.dtos'

const content: unknown = manifest.blocks.find((block) => block.key === 'jogo-pronto')?.content

test('participação sem alvos atravessa o contrato HTTP e a publicação', async () => {
  if (!isInteractiveBlock(content) || content.activity.type !== 'project-play')
    throw new Error('Jogo ausente')
  const participation: InteractiveBlock = {
    ...content,
    activity: { ...content.activity, completion: 'participation', targets: [] },
  }
  const app = new Elysia().post('/', ({ body }) => body, { body: InteractiveBlockSchema })
  const response = await app.handle(
    new Request('http://members.test/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(participation),
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(participation)
  expect(parsePublishedLessonBlock(participation)).toEqual(participation)
})

test('o jogo real do manifesto atravessa rascunho e publicação sem perder projeto e alvos', () => {
  if (!isInteractiveBlock(content)) throw new Error('Manifesto sem jogo válido')
  const result = draftCommand({
    expectedRevision: crypto.randomUUID(),
    operationId: crypto.randomUUID(),
    change: { type: 'block', block: { id: crypto.randomUUID(), content } },
  })
  if (result.change.type !== 'block') throw new Error('Mudança inesperada')
  expect(result.change.block.content).toEqual({ ...content })
  expect(parsePublishedLessonBlock(content)).toEqual(content)
})

test('uma rota tipada preserva o projeto completo e suas imagens embutidas', async () => {
  const app = new Elysia().post('/', ({ body }) => body, {
    body: t.Object({ content: InteractiveBlockSchema }),
  })
  const response = await app.handle(
    new Request('http://members.test/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content }),
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ content })
})
