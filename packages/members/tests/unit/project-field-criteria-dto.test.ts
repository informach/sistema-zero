import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  applyLessonDraftChange,
  defaultLessonSection,
  isSectionCompletion,
  type LessonDraftDocument,
  type SectionStructureRule,
} from '@sistemazero/core/learning'
import { Elysia } from 'elysia'
import { SectionRule } from '../../src/interfaces/http/learning.dtos'
import { DraftCommandSchema, draftCommand } from '../../src/interfaces/http/lesson-draft.dtos'

const range: SectionStructureRule = {
  type: 'usesBlock',
  blockType: 'sz_val_number',
  fieldRanges: { NUM: { min: 0, minExclusive: true } },
}
const text: SectionStructureRule = {
  type: 'usesBlock',
  blockType: 'sz_g2d_set_stage_description',
  fieldText: { DESCRIPTION: { nonBlank: true } },
}
const nested: SectionStructureRule = {
  type: 'usesBlock',
  blockType: 'sz_g2d_top_down',
  inputBlocks: {
    SPEED: { blockType: 'sz_val_number', fieldRanges: { NUM: { max: 0, maxExclusive: true } } },
  },
}
const composed: SectionStructureRule = {
  type: 'usesBlock',
  blockType: 'sz_g2d_on_overlap',
  fieldAlternatives: [
    { A: 'personagem', B: 'chave' },
    { A: 'chave', B: 'personagem' },
  ],
  inputBlocksAll: {
    BODY: [
      { blockType: 'sz_g2d_destroy_sprite', fields: { SPRITE: 'chave' } },
      {
        blockType: 'sz_js_var_assign',
        fields: { NAME: 'temChave' },
        inputBlocksAll: {
          VALUE: [{ blockType: 'sz_val_bool', fieldAlternatives: [{ VALUE: 'true' }] }],
        },
      },
    ],
  },
}
const ordered: SectionStructureRule = {
  type: 'usesBlock',
  blockType: 'sz_js_if_else',
  inputBlocks: { COND: { blockType: 'sz_val_variable', fields: { NAME: 'vida' } } },
  beforePattern: {
    blockType: 'sz_js_if_else',
    inputBlocks: { COND: { blockType: 'sz_val_variable', fields: { NAME: 'pontos' } } },
  },
}
const { type: _orderedType, ...orderedPattern } = ordered
const nestedOrder: SectionStructureRule = {
  type: 'usesBlock',
  blockType: 'sz_g2d_update_each_frame',
  inputBlocksAll: { BODY: [orderedPattern] },
}
const request = (body: unknown, method = 'POST') =>
  new Request('http://members.test/', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

test('real HTTP normalization and draft edits retain every new criterion at top level and in sockets', async () => {
  const app = new Elysia().post('/', ({ body }) => body, { body: SectionRule })
  for (const rule of [range, text, nested, composed, ordered, nestedOrder]) {
    const response = await app.handle(request(rule))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(rule)
  }
  const section = {
    ...defaultLessonSection(randomUUID(), 'Teste', []),
    completion: {
      version: 1 as const,
      blockIds: [],
      projectChecks: [range, text, nested, composed, ordered, nestedOrder].map((rule, i) => ({
        id: `check${i}`,
        label: 'Conferir',
        rule,
      })),
    },
  }
  let document: LessonDraftDocument = {
    title: 'Aula',
    slug: 'aula',
    estimatedMinutes: null,
    blocks: [],
    sections: [],
    attachments: [],
    plannedVideos: [],
  }
  const draft = new Elysia().patch(
    '/',
    ({ body }) => {
      document = applyLessonDraftChange(document, draftCommand(body).change)
      return document
    },
    { body: DraftCommandSchema },
  )
  for (const title of ['Teste', 'Título editado']) {
    const sections = [{ ...section, title }]
    const response = await draft.handle(
      request(
        {
          expectedRevision: randomUUID(),
          operationId: randomUUID(),
          change: { type: 'structure', sections },
        },
        'PATCH',
      ),
    )
    expect(response.status).toBe(200)
    expect((await response.json()).sections).toEqual(sections)
    expect(document.sections).toEqual(sections)
    expect(isSectionCompletion(document.sections[0]?.completion)).toBe(true)
  }
})

test('HTTP rejects malformed raw maps instead of erasing a bound or text restriction', async () => {
  let accepted = 0
  const app = new Elysia().post(
    '/',
    ({ body }) => {
      accepted++
      return body
    },
    { body: SectionRule },
  )
  const invalid = [
    { fieldRanges: { NUM: {} } },
    { fieldRanges: { NUM: { min: 0, minExlusive: true } } },
    { fieldRanges: { NUM: { min: '0' } } },
    { fieldRanges: { NUM: { min: 1, max: 0 } } },
    { fieldRanges: { NUM: { minExclusive: true } } },
    { fieldRanges: { NUM: { min: 1, max: 1, maxExclusive: true } } },
    { fieldText: { TEXT: { nonBlank: false } } },
    { fieldText: { TEXT: { nonBlank: true, other: true } } },
    { fieldRanges: null },
    { fieldText: [] },
    { fieldAlternatives: [] },
    { fieldAlternatives: [{ A: 'p' }, { B: 'k' }] },
    { fieldAlternatives: [{ A: {} }] },
    { inputBlocksAll: {} },
    { inputBlocksAll: { BODY: [] } },
    { inputBlocksAll: { BODY: Array.from({ length: 21 }, () => ({ blockType: 'x' })) } },
    { beforePattern: null },
    { beforePattern: [] },
    { beforePattern: { blockType: 1 } },
  ]
  for (const fields of invalid) {
    for (const rule of [
      { type: 'usesBlock', blockType: 'sz_val_number', ...fields },
      {
        type: 'usesBlock',
        blockType: 'sz_g2d_top_down',
        inputBlocks: { SPEED: { blockType: 'sz_val_number', ...fields } },
      },
    ]) {
      const response = await app.handle(request(rule))
      expect([400, 422]).toContain(response.status)
    }
  }
  expect(accepted).toBe(0)
})

test('normalization keeps conflicting field criteria so canonical publication validation rejects them', async () => {
  const app = new Elysia().post('/', ({ body }) => body, { body: SectionRule })
  const conflict = { ...range, fields: { NUM: 0 } }
  const response = await app.handle(request(conflict))
  expect(response.status).toBe(200)
  const decoded = await response.json()
  expect(decoded).toEqual(conflict)
  expect(
    isSectionCompletion({
      version: 1,
      blockIds: [],
      projectChecks: [{ id: 'check', label: 'Conferir', rule: decoded }],
    }),
  ).toBe(false)
})

test('draft schema cleanup retains strict Decode for malformed criteria', async () => {
  let accepted = 0
  const app = new Elysia().patch(
    '/',
    () => {
      accepted++
      return {}
    },
    { body: DraftCommandSchema },
  )
  for (const rule of [
    { ...composed, fieldAlternatives: [{ A: 'p' }, { B: 'k' }] },
    { ...range, fieldRanges: { NUM: { min: 0, minExlusive: true } } },
    {
      ...nested,
      inputBlocks: {
        SPEED: { blockType: 'sz_val_text', fieldText: { TEXT: { nonBlank: true, typo: true } } },
      },
    },
  ]) {
    const section = {
      ...defaultLessonSection(randomUUID(), 'Teste', []),
      completion: {
        version: 1,
        blockIds: [],
        projectChecks: [{ id: 'check', label: 'Conferir', rule }],
      },
    }
    const response = await app.handle(
      request(
        {
          expectedRevision: randomUUID(),
          operationId: randomUUID(),
          change: { type: 'structure', sections: [section] },
        },
        'PATCH',
      ),
    )
    expect([400, 422]).toContain(response.status)
  }
  expect(accepted).toBe(0)
})

test('mixed AND socket depths cannot lose their deepest condition in HTTP normalization', async () => {
  const app = new Elysia().post('/', ({ body }) => body, { body: SectionRule })
  let pattern: Record<string, unknown> = {
    blockType: 'sz_val_number',
    fieldRanges: { NUM: { min: 0 } },
  }
  for (let i = 0; i < 4; i++)
    pattern =
      i % 2
        ? { blockType: 'x', inputBlocks: { BODY: pattern } }
        : { blockType: 'x', inputBlocksAll: { BODY: [pattern] } }
  const valid = { ...pattern, type: 'usesBlock' }
  const response = await app.handle(request(valid))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(valid)
  expect(
    (
      await app.handle(
        request({ type: 'usesBlock', blockType: 'x', inputBlocksAll: { BODY: [pattern] } }),
      )
    ).status,
  ).toBe(422)
})

test('beforePattern survives all permitted HTTP depths and rejects a fifth edge without stripping', async () => {
  const app = new Elysia().post('/', ({ body }) => body, { body: SectionRule })
  let pattern: Record<string, unknown> = { blockType: 'sz_js_if_else' }
  for (let i = 0; i < 4; i++) pattern = { blockType: 'sz_js_if_else', beforePattern: pattern }
  const valid = { ...pattern, type: 'usesBlock' }
  const response = await app.handle(request(valid))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(valid)
  expect(
    (
      await app.handle(
        request({ type: 'usesBlock', blockType: 'sz_js_if_else', beforePattern: pattern }),
      )
    ).status,
  ).toBe(422)
  const conflict = { ...ordered, beforeBlock: 'sz_js_if_else' }
  const retained = await app.handle(request(conflict))
  expect(retained.status).toBe(200)
  expect(await retained.json()).toEqual(conflict)
  expect(
    isSectionCompletion({
      version: 1,
      blockIds: [],
      projectChecks: [{ id: 'order', label: 'Ordem', rule: conflict }],
    }),
  ).toBe(false)
})
