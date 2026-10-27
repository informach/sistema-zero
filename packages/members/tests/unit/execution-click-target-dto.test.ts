import { expect, test } from 'bun:test'
import { isDeepStrictEqual } from 'node:util'
import { type ExecutionStep, isSectionExecutionRule } from '@sistemazero/core/learning'
import { Elysia, getSchemaValidator } from 'elysia'
import { SectionRule } from '../../src/interfaces/http/learning.dtos'

const steps: ExecutionStep[] = [
  { action: 'clickTarget', target: { kind: 'sprite', path: 'alvo', groupPath: 'grupo' } },
  { action: 'clickTarget', target: { kind: 'lastPoint' } },
  { action: 'clickTarget', target: { kind: 'outsideGroup', path: 'grupo' } },
]
const rule = (value: ExecutionStep[]) => ({
  type: 'behavior' as const,
  steps: value,
  expect: {
    target: { kind: 'value' as const, path: 'achados' },
    compare: 'equals' as const,
    value: 3,
  },
})

test('normalization preserves all canonical adaptive click variants without rewriting their targets', () => {
  const validator = getSchemaValidator(SectionRule, { normalize: true })
  for (const input of [
    rule(steps),
    { type: 'script' as const, steps, code: 'return jogo.achados === 3' },
  ]) {
    expect(isSectionExecutionRule(input)).toBe(true)
    const result = validator.safeParse(input)
    expect(result.success).toBe(true)
    if (!result.success) throw new Error('Canonical execution rule rejected by the HTTP schema')
    expect(isDeepStrictEqual(result.data, input)).toBe(true)
  }
})

test('the typed HTTP handler receives the same rule; final ordering remains the Core authority', async () => {
  const app = new Elysia().post('/', ({ body }) => body, { body: SectionRule })
  const response = await app.handle(
    new Request('http://members.test/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rule(steps)),
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(rule(steps))
  // Draft transport does not invent a previous point or relax publication validation.
  expect(
    isSectionExecutionRule(rule([{ action: 'clickTarget', target: { kind: 'lastPoint' } }])),
  ).toBe(false)
})

test('unknown or incomplete adaptive click variants do not pass the HTTP shape', () => {
  const validator = getSchemaValidator(SectionRule, { normalize: true })
  for (const target of [
    { kind: 'anything' },
    { kind: 'sprite', path: 'alvo' },
    { kind: 'outsideGroup' },
  ]) {
    expect(
      validator.safeParse({ ...rule([]), steps: [{ action: 'clickTarget', target }] }).success,
    ).toBe(false)
  }
})

test('HTTP normalization never turns invalid adaptive targets or extra step fields into a valid rule', async () => {
  const app = new Elysia().post('/', ({ body }) => body, { body: SectionRule })
  for (const step of [
    { action: 'clickTarget', target: { kind: 'lastPoint', path: 'must-not-be-erased' } },
    { action: 'clickTarget', target: { kind: 'outsideGroup', path: 'grupo', groupPath: 'extra' } },
    {
      action: 'clickTarget',
      target: { kind: 'sprite', path: 'alvo', groupPath: 'grupo', extra: true },
    },
    { action: 'clickTarget', target: { kind: 'lastPoint' }, extra: true },
    { action: 'clickTarget', target: { kind: 'outsideGroup', path: 'grupo.constructor' } },
    {
      action: 'clickTarget',
      target: { kind: 'sprite', path: '__proto__.alvo', groupPath: 'grupo' },
    },
  ]) {
    const input = { ...rule([]), steps: [steps[0], step] }
    expect(isSectionExecutionRule(input)).toBe(false)
    const response = await app.handle(
      new Request('http://members.test/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    )
    expect([400, 422]).toContain(response.status)
  }
})

test('adaptive movement survives normalization and the HTTP handler with its budgets and obstacles', async () => {
  const input = rule([
    {
      action: 'approachSprite',
      actorPath: 'personagem',
      targetPath: 'farol',
      avoidPaths: ['chave'],
      timeoutMs: 4500,
    },
  ])
  const validator = getSchemaValidator(SectionRule, { normalize: true })
  const parsed = validator.safeParse(input)
  expect(parsed.success).toBe(true)
  if (parsed.success) expect(isDeepStrictEqual(parsed.data, input)).toBe(true)
  const app = new Elysia().post('/', ({ body }) => body, { body: SectionRule })
  const response = await app.handle(
    new Request('http://members.test/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(input)
  for (const patch of [{ timeoutMs: 7501 }, { targetPath: 'farol.constructor' }, { extra: true }]) {
    const invalid = rule([{ ...input.steps[0]!, ...patch } as ExecutionStep])
    expect(validator.safeParse(invalid).success).toBe(false)
  }
})
