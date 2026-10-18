import { expect, test } from 'bun:test'
import { StudioPythonActivitySchema } from '@sistemazero/core/studio/python-activity'
import { Elysia } from 'elysia'
import { documentFixture } from '../../../studio/src/state/fixtures/projectDocuments'
import { BlockBody } from '../../src/interfaces/http/dtos'

// Real nested authoring DTO/TransformDecode through HTTP, without a database or authorization claim.
const app = new Elysia().post('/block', ({ body }) => body.content, { body: BlockBody }).compile()
const post = (content: unknown) =>
  app.handle(
    new Request('http://localhost/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }),
  )
const python = () => ({
  version: 1,
  programmingLanguage: 'python',
  profileId: 'python-test',
  instructions: '',
  checks: [
    {
      id: 'fn',
      label: 'Dicionário',
      kind: 'testcase',
      functionName: 'K',
      cases: [
        {
          args: [JSON.parse('{"__proto__":{"safe":true},"constructor":2}')],
          expected: JSON.parse('{"__proto__":{"safe":true},"constructor":2}'),
        },
      ],
    },
  ],
})

test('internal Python inspection contract preserves dictionaries and canonical identifier normalization', () => {
  const parsed = StudioPythonActivitySchema.parse(python())
  const body = JSON.stringify(parsed)
  expect(body).toContain('"functionName":"K"')
  expect(body.match(/"__proto__"/g)).toHaveLength(2)
  expect(body).toContain('"constructor":2')
})

test('internal Python inspection contract rejects JS-only checks, forgeable gates and excessive nested data', () => {
  let deep: unknown = null
  for (let index = 0; index < 30; index++) deep = [deep]
  for (const activity of [
    { ...python(), passingScore: 100 },
    {
      ...python(),
      checks: [
        {
          id: 'dom',
          label: 'DOM',
          kind: 'behavior',
          rule: { type: 'domSelectorExists', selector: 'canvas' },
        },
      ],
    },
    {
      ...python(),
      checks: [
        {
          id: 'fn',
          label: 'Limites',
          kind: 'testcase',
          functionName: 'f',
          cases: [{ args: [], expected: deep }],
        },
      ],
    },
    { ...python(), unexpected: true },
  ]) {
    expect(StudioPythonActivitySchema.safeParse(activity).success).toBe(false)
  }
})

test('legacy JavaScript authoring remains readable without a language flag and does not retain old activity grading', async () => {
  const {
    programmingLanguage: _language,
    runtime: _runtime,
    ...legacy
  } = documentFixture('javascript', 'classic')
  const response = await post({
    kind: 'studio',
    initialProject: { ...legacy, formatVersion: 2 },
    activity: {
      instructions: 'Use um laço.',
      passingScore: 100,
      checks: [{ id: 'loop', label: 'Laço', kind: 'structure', rule: { type: 'usesLoop' } }],
    },
  })
  expect(response.status).toBe(200)
  const saved = await response.json()
  expect(saved.initialProject.files).toEqual(legacy.files)
  expect(saved.initialProject.programmingLanguage).toBeUndefined()
  expect(saved).not.toHaveProperty('activity')
})
