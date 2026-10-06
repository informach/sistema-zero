import { expect, test } from 'bun:test'
import {
  evaluateProjectStructure,
  isProjectBlockPattern,
  type SectionStructureRule,
} from '../src/learning'

const sprite = {
  type: 'sz_g2d_create_sprite',
  fields: { ID: 'dino' },
  inputs: { X: { shadow: { type: 'sz_val_number', fields: { NUM: 120 } } } },
}
const project = (child: unknown, area = 'start') => ({
  blocksState: {
    blocks: { blocks: [{ type: `sz_frame_${area}`, inputs: { CHILDREN: { block: child } } }] },
  },
})
const rule: SectionStructureRule = {
  type: 'usesBlock',
  blockType: sprite.type,
  area: 'start',
  fields: { ID: 'dino' },
  inputs: { X: 120 },
}

test('accepted field options are constrained to the same enabled nested block', () => {
  const optionsRule: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'sz_js_if_else',
    area: 'events',
    inputBlocks: {
      THEN: {
        blockType: 'sz_g2d_set_image',
        fields: { SPRITE: 'farol' },
        fieldOptions: { IMAGE: ['farol-listrado-aceso', 'farol-de-pedra-aceso'] },
      },
    },
  }
  const change = (image: string, sprite = 'farol') => ({
    type: 'sz_g2d_set_image',
    fields: { SPRITE: sprite, IMAGE: image },
  })
  const condition = (then: unknown, other?: unknown) =>
    project(
      { type: 'sz_js_if_else', inputs: { THEN: { block: then }, ELSE: { block: other } } },
      'events',
    )
  for (const image of ['farol-listrado-aceso', 'farol-de-pedra-aceso'])
    expect(evaluateProjectStructure(optionsRule, condition(change(image)))).toBe(true)
  expect(evaluateProjectStructure(optionsRule, condition(change('farol-listrado-apagado')))).toBe(
    false,
  )
  expect(
    evaluateProjectStructure(
      optionsRule,
      condition(change('barco'), change('farol-de-pedra-aceso')),
    ),
  ).toBe(false)
  expect(
    evaluateProjectStructure(optionsRule, condition(change('farol-de-pedra-aceso', 'barco'))),
  ).toBe(false)
  expect(
    evaluateProjectStructure(
      optionsRule,
      condition({ ...change('farol-de-pedra-aceso'), disabled: true }),
    ),
  ).toBe(false)
})

test('field option lists reject empty, unbounded or conflicting conditions', () => {
  const pattern = { blockType: 'sz_g2d_set_image', fieldOptions: { IMAGE: ['aceso'] } }
  expect(isProjectBlockPattern(pattern)).toBe(true)
  for (const options of [
    [],
    [''],
    ['aceso', 'aceso'],
    [false],
    Array.from({ length: 51 }, (_, i) => String(i)),
  ])
    expect(isProjectBlockPattern({ ...pattern, fieldOptions: { IMAGE: options } })).toBe(false)
  expect(isProjectBlockPattern({ ...pattern, fields: { IMAGE: 'outro' } })).toBe(false)
})

test('requires the configured area, connected enabled block and literal parameters', () => {
  expect(evaluateProjectStructure(rule, project(sprite))).toBe(true)
  expect(evaluateProjectStructure(rule, project(sprite, 'events'))).toBe(false)
  expect(evaluateProjectStructure(rule, { blocksState: { blocks: { blocks: [sprite] } } })).toBe(
    false,
  )
  expect(evaluateProjectStructure(rule, project({ ...sprite, disabled: true }))).toBe(false)
  expect(
    evaluateProjectStructure(rule, project({ ...sprite, disabledReasons: ['MANUALLY_DISABLED'] })),
  ).toBe(false)
  expect(evaluateProjectStructure(rule, project({ ...sprite, fields: { ID: 'outro' } }))).toBe(
    false,
  )
  expect(
    evaluateProjectStructure(
      rule,
      project({
        ...sprite,
        inputs: {
          X: {
            block: { type: 'sz_val_number', fields: { NUM: 20 } },
            shadow: { type: 'sz_val_number', fields: { NUM: 120 } },
          },
        },
      }),
    ),
  ).toBe(false)
})

test('disabled containers and orphan shadows do not satisfy checks; nesting is explicit', () => {
  const nested = { type: 'sz_js_repeat', inputs: { BODY: { block: sprite } } }
  expect(evaluateProjectStructure({ ...rule, withinBlock: nested.type }, project(nested))).toBe(
    true,
  )
  expect(evaluateProjectStructure({ ...rule, withinBlock: nested.type }, project(sprite))).toBe(
    false,
  )
  expect(evaluateProjectStructure(rule, project({ ...nested, disabled: true }))).toBe(false)
  expect(
    evaluateProjectStructure(
      rule,
      project({ type: 'other', inputs: { GHOST: { shadow: sprite } } }),
    ),
  ).toBe(false)
  // Montar uma área é um objetivo de preparação válido; não implica execução.
  expect(
    evaluateProjectStructure({ type: 'usesBlock', blockType: 'sz_frame_start' }, project(null)),
  ).toBe(true)
})

test('missing parameters cannot match the text undefined', () => {
  expect(
    evaluateProjectStructure({ ...rule, fields: { MISSING: 'undefined' } }, project(sprite)),
  ).toBe(false)
  expect(
    evaluateProjectStructure(
      { ...rule, inputs: { X: 'undefined' } },
      project({
        ...sprite,
        inputs: { X: { block: { type: 'sz_val_number', fields: {} } } },
      }),
    ),
  ).toBe(false)
})

test('active literal shadows count as blocks, while replaced or disabled shadows do not', () => {
  const numberRule: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'sz_val_number',
    area: 'start',
    withinBlock: sprite.type,
    fields: { NUM: 120 },
  }
  expect(evaluateProjectStructure(numberRule, project(sprite))).toBe(true)
  const replace = (input: unknown) => project({ ...sprite, inputs: { X: input } })
  expect(
    evaluateProjectStructure(
      numberRule,
      replace({
        shadow: { type: 'sz_val_number', fields: { NUM: 120 } },
        block: { type: 'sz_val_number', fields: { NUM: 20 } },
      }),
    ),
  ).toBe(false)
  expect(
    evaluateProjectStructure(
      numberRule,
      replace({ shadow: { type: 'sz_val_number', fields: { NUM: 120 }, disabled: true } }),
    ),
  ).toBe(false)
  expect(evaluateProjectStructure(numberRule, project({ ...sprite, disabled: true }))).toBe(false)
})

test('large structural programs are evaluated without overflowing the argument stack', () => {
  const statements = Array.from({ length: 150_000 }, () => null)
  expect(evaluateProjectStructure({ type: 'usesLoop' }, { ir: { js: statements } })).toBe(false)
})
