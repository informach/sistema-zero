import { expect, test } from 'bun:test'
import { isDeepStrictEqual } from 'node:util'
import {
  defaultLessonSection,
  isSectionExecutionRule,
  type SectionExecutionRule,
} from '@sistemazero/core/learning'
import { Elysia, getSchemaValidator } from 'elysia'
import {
  projectCheckAuthoring,
  studioSectionCompletionIssues,
} from '../../../studio/src/blockly/projectCheckAuthoring'
import { SectionRule } from '../../src/interfaces/http/learning.dtos'

const directional = () => ({
  type: 'behavior',
  observation: { type: 'idleBeforeAction', idleMs: 80 },
  steps: [{ action: 'press', key: 'ArrowUp', holdMs: 80 }],
  expect: { target: { kind: 'spritePosition', path: 'avatar', axis: 'y' }, compare: 'decreased' },
})

test('HTTP normalization preserves the complete canonical directional rule and existing adaptive clicks', async () => {
  const validator = getSchemaValidator(SectionRule, { normalize: true })
  for (const input of [
    directional(),
    {
      type: 'behavior',
      steps: [
        { action: 'clickTarget', target: { kind: 'sprite', path: 'alvo', groupPath: 'grupo' } },
        { action: 'clickTarget', target: { kind: 'lastPoint' } },
      ],
      expect: { target: { kind: 'value', path: 'achados' }, compare: 'equals', value: 1 },
    },
    {
      type: 'behavior',
      steps: [{ action: 'press', key: 'ArrowRight' }],
      expect: { target: { kind: 'value', path: 'avatar.x' }, compare: 'changed' },
    },
  ]) {
    expect(isSectionExecutionRule(input)).toBe(true)
    const parsed = validator.safeParse(input)
    expect(parsed.success).toBe(true)
    if (!parsed.success) throw Error('Canonical rule rejected')
    expect(isDeepStrictEqual(parsed.data, input)).toBe(true)
  }
  const app = new Elysia().post('/', ({ body }) => body, { body: SectionRule })
  const response = await app.handle(
    new Request('http://members.test/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(directional()),
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(directional())
})

test('raw invalid movement never falls through to a normalized historical behavior', async () => {
  let accepted = 0
  const app = new Elysia().post(
    '/',
    ({ body }) => {
      accepted++
      return body
    },
    { body: SectionRule },
  )
  const good = directional()
  for (const input of [
    { ...good, extra: true },
    { ...good, expect: { ...good.expect, extra: true } },
    { ...good, expect: { ...good.expect, value: 5 } },
    { ...good, expect: { ...good.expect, target: { ...good.expect.target, extra: true } } },
    { ...good, expect: { ...good.expect, target: { ...good.expect.target, path: '' } } },
    {
      ...good,
      expect: { ...good.expect, target: { ...good.expect.target, path: 'avatar.__proto__' } },
    },
    { ...good, expect: { ...good.expect, target: { ...good.expect.target, axis: 'z' } } },
    { ...good, observation: { type: 'idleBeforeAction', idleMs: 251 } },
    { ...good, observation: { type: 'idleBeforeAction', idleMs: 80, retry: true } },
    { ...good, steps: [{ ...good.steps[0], extra: true }] },
    { ...good, steps: [{ action: 'press', key: 'F5', holdMs: 80 }] },
    { ...good, observation: null },
    { ...good, expect: { target: { kind: 'value', path: 'pontos' }, compare: 'equals', value: 3 } },
  ]) {
    const before = JSON.stringify(input)
    expect(isSectionExecutionRule(input)).toBe(false)
    const response = await app.handle(
      new Request('http://members.test/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: before,
      }),
    )
    expect([400, 422]).toContain(response.status)
    expect(JSON.stringify(input)).toBe(before)
  }
  expect(accepted).toBe(0)
})

const impossibleRelativeRules = () =>
  ['increased', 'decreased'].flatMap((compare) => [
    { type: 'behavior', steps: [], expect: { target: { kind: 'text' }, compare } },
    { type: 'behavior', steps: [], expect: { target: { kind: 'console' }, compare } },
    { type: 'behavior', steps: [], expect: { target: { kind: 'game', field: 'phase' }, compare } },
  ])

test('known text relative targets fail raw HTTP dispatch instead of being admitted for an impossible execution', async () => {
  let accepted = 0
  const app = new Elysia().post(
    '/',
    ({ body }) => {
      accepted++
      return body
    },
    { body: SectionRule },
  )
  for (const input of impossibleRelativeRules()) {
    const response = await app.handle(
      new Request('http://members.test/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    )
    expect([400, 422]).toContain(response.status)
  }
  expect(accepted).toBe(0)
  for (const target of [
    { kind: 'value', path: 'pontos' },
    ...['score', 'goal', 'health'].map((field) => ({ kind: 'game', field })),
  ]) {
    const input = { type: 'behavior', steps: [], expect: { target, compare: 'increased' } }
    const response = await app.handle(
      new Request('http://members.test/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(input)
  }
})

test('authoring and actual publication reject impossible relative targets without blocking historical comparisons', () => {
  const sectionId = '11111111-1111-4111-8111-111111111111',
    exampleId = '22222222-2222-4222-8222-222222222222'
  const issues = (rule: SectionExecutionRule) => {
    const project = {
      formatVersion: 2,
      name: 'Comparação',
      files: { 'index.html': '', 'style.css': '', 'script.js': '' },
      installedExtensions: [],
      ...(rule.type === 'behavior' && rule.expect.target.kind === 'game'
        ? { kind: 'pro', tree: {}, proMeta: { templateId: 'canvas-puzzle' } }
        : {}),
    }
    const content = {
      kind: 'studio',
      initialProject: project,
      projectExamples: {
        version: 1,
        examples: { [exampleId]: project },
        sections: { [sectionId]: { solutionExampleId: exampleId } },
      },
    }
    const section = {
      ...defaultLessonSection(sectionId, 'Comparação', []),
      workspaceBlockId: 'workspace',
      completion: {
        version: 1 as const,
        blockIds: [],
        projectChecks: [{ id: 'comparar', label: 'Confira', rule }],
      },
    }
    return {
      authoring: projectCheckAuthoring(content).issues(rule),
      publication: studioSectionCompletionIssues([section], [{ id: 'workspace', content }]),
    }
  }
  for (const input of impossibleRelativeRules()) {
    // Use the established rule shape without relying on the guard under test.
    const compare = input.expect.compare === 'increased' ? 'increased' : 'decreased'
    const target = input.expect.target
    const rule: SectionExecutionRule = {
      type: 'behavior',
      steps: [],
      expect: {
        target:
          target.kind === 'text'
            ? { kind: 'text' }
            : target.kind === 'console'
              ? { kind: 'console' }
              : { kind: 'game', field: 'phase' },
        compare,
      },
    }
    expect(issues(rule).publication.length).toBeGreaterThan(0)
    expect(issues(rule).authoring).toContain('O objetivo tem passos, valores ou casos inválidos.')
  }
  for (const rule of [
    {
      type: 'behavior',
      steps: [],
      expect: { target: { kind: 'text' }, compare: 'contains', value: 'Oi' },
    },
    {
      type: 'behavior',
      steps: [],
      expect: { target: { kind: 'game', field: 'phase' }, compare: 'equals', value: 'won' },
    },
  ] satisfies SectionExecutionRule[]) {
    expect(issues(rule).authoring).toEqual([])
    expect(issues(rule).publication).toEqual([])
  }
})
