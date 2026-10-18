import { expect, test } from 'bun:test'
import { EXECUTION_LIMITS, isSectionCompletion } from '@sistemazero/core/learning'
import { Elysia } from 'elysia'
import { SectionCompletionSchema } from '../../src/interfaces/http/learning.dtos'

test.each([
  'javascript',
  'python',
] as const)('the real HTTP normalizer preserves %s objective hints and optional status', async (programmingLanguage) => {
  const check = {
    id: 'loop',
    label: 'Use uma repetição',
    hint: 'Procure a gaveta de repetições.',
    optional: true,
    programmingLanguage,
    ...(programmingLanguage === 'python' ? { profileId: 'python-test' } : {}),
    rule: { type: 'usesLoop' },
  }
  const body = { version: 1, blockIds: [], projectChecks: [check] }
  const app = new Elysia().post('/objectives', ({ body }) => body, {
    body: SectionCompletionSchema,
  })
  const response = await app.handle(
    new Request('http://localhost/objectives', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
  expect(response.status).toBe(200)
  const saved = await response.json()
  expect(saved).toEqual(body)
  expect(isSectionCompletion(saved)).toBe(true)
})

test('function objective HTTP decoding preserves JSON cases and rejects oversized values', async () => {
  const app = new Elysia().post('/objectives', ({ body }) => body, {
    body: SectionCompletionSchema,
  })
  const request = (expected: unknown) => {
    const body = {
      version: 1,
      blockIds: [],
      projectChecks: [
        {
          id: 'sum',
          label: 'Calcule',
          rule: {
            type: 'functionReturns',
            name: 'sum',
            cases: [{ args: [[1, 2], { value: null }], expected }],
          },
        },
      ],
    }
    return app.handle(
      new Request('http://localhost/objectives', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  }
  const valid = await request({ total: 3, values: [true, null, 'texto'] })
  expect(valid.status).toBe(200)
  const decoded = await valid.json()
  expect(isSectionCompletion(decoded)).toBe(true)
  expect(decoded.projectChecks[0].rule.cases[0].expected).toEqual({
    total: 3,
    values: [true, null, 'texto'],
  })
  expect((await request('x'.repeat(EXECUTION_LIMITS.maxValueChars))).status).not.toBe(200)
})
