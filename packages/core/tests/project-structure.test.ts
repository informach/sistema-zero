import { expect, test } from 'bun:test'
import {
  evaluateProjectStructure,
  isProjectBlockPattern,
  type ProjectBlockPattern,
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

test('numeric ranges keep sign and open/closed bounds without coercing empty or nonnumeric values', () => {
  const rangeRule: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'speed',
    fieldRanges: { SPEED: { min: 0, minExclusive: true, max: 10 } },
  }
  const check = (value: unknown) =>
    evaluateProjectStructure(rangeRule, project({ type: 'speed', fields: { SPEED: value } }))
  for (const value of [1, 10, 0.5, '1', '+2.5', ' 3 ', '.5', '1e1']) expect(check(value)).toBe(true)
  for (const value of [
    0,
    -1,
    11,
    '',
    '  ',
    '0x2',
    '0b1',
    'NaN',
    'Infinity',
    '1,5',
    '1e309',
    true,
    null,
    undefined,
    {},
    [],
    Infinity,
    NaN,
  ])
    expect(check(value)).toBe(false)
  expect(evaluateProjectStructure(rangeRule, project({ type: 'speed' }))).toBe(false)
  const negative: SectionStructureRule = {
    ...rangeRule,
    fieldRanges: { SPEED: { max: 0, maxExclusive: true } },
  }
  expect(
    evaluateProjectStructure(negative, project({ type: 'speed', fields: { SPEED: '-2e-1' } })),
  ).toBe(true)
  expect(evaluateProjectStructure(negative, project({ type: 'speed', fields: { SPEED: 0 } }))).toBe(
    false,
  )
  const exact: SectionStructureRule = { ...rangeRule, fieldRanges: { SPEED: { min: 2, max: 2 } } }
  expect(evaluateProjectStructure(exact, project({ type: 'speed', fields: { SPEED: 2 } }))).toBe(
    true,
  )
  expect(evaluateProjectStructure(exact, project({ type: 'speed', fields: { SPEED: 3 } }))).toBe(
    false,
  )
  const zero: SectionStructureRule = { ...rangeRule, fieldRanges: { SPEED: { min: 0, max: 0 } } }
  expect(evaluateProjectStructure(zero, project({ type: 'speed', fields: { SPEED: '0' } }))).toBe(
    true,
  )
  for (const empty of ['', ' ', null, false])
    expect(
      evaluateProjectStructure(zero, project({ type: 'speed', fields: { SPEED: empty } })),
    ).toBe(false)
})

test('nonblank text requires an actual string, not a truthy or coerced field', () => {
  const textRule: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'description',
    fieldText: { DESCRIPTION: { nonBlank: true } },
  }
  for (const value of ['Minha ilha', '  Olá 🌊  ', '0'])
    expect(
      evaluateProjectStructure(
        textRule,
        project({ type: 'description', fields: { DESCRIPTION: value } }),
      ),
    ).toBe(true)
  for (const value of ['', ' \t\n\u00a0 ', 1, false, {}, null, undefined])
    expect(
      evaluateProjectStructure(
        textRule,
        project({ type: 'description', fields: { DESCRIPTION: value } }),
      ),
    ).toBe(false)
})

test('ranges and text remain on the same enabled block and recursive input branch', () => {
  const child: ProjectBlockPattern = {
    blockType: 'move',
    fields: { ID: 'avatar' },
    fieldOptions: { MODE: ['walk', 'run'] },
    fieldRanges: { SPEED: { min: 0, minExclusive: true } },
    fieldText: { DESCRIPTION: { nonBlank: true } },
  }
  const parent: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'if',
    inputBlocks: { THEN: child },
  }
  const good = {
    type: 'move',
    fields: { ID: 'avatar', MODE: 'run', SPEED: 2, DESCRIPTION: 'Pelo jardim' },
  }
  const state = (then: unknown, other?: unknown) =>
    project({ type: 'if', inputs: { THEN: { block: then }, ELSE: { block: other } } })
  expect(evaluateProjectStructure(parent, state(good))).toBe(true)
  expect(evaluateProjectStructure(parent, state({ ...good, disabled: true }))).toBe(false)
  expect(
    evaluateProjectStructure(
      parent,
      state({ ...good, fields: { ...good.fields, SPEED: 0 } }, good),
    ),
  ).toBe(false)
  expect(
    evaluateProjectStructure(
      parent,
      state({
        ...good,
        fields: { ...good.fields, DESCRIPTION: '' },
        next: { block: { ...good, fields: { ...good.fields, SPEED: 0 } } },
      }),
    ),
  ).toBe(false)
})

test('range/text contracts refuse malformed bounds, exclusivity and cross-map conflicts', () => {
  const base = { blockType: 'move' }
  for (const range of [
    { min: 0 },
    { max: 0, maxExclusive: true },
    { min: -2, max: -1 },
    { min: 1, max: 1 },
  ])
    expect(isProjectBlockPattern({ ...base, fieldRanges: { SPEED: range } })).toBe(true)
  for (const range of [
    {},
    null,
    [],
    { min: '0' },
    { min: NaN },
    { min: Infinity },
    { max: -Infinity },
    { min: 2, max: 1 },
    { min: 1, max: 1, minExclusive: true },
    { min: 1, max: 1, maxExclusive: true },
    { minExclusive: true },
    { min: 0, maxExclusive: true },
    { min: 0, minExclusive: false },
    { min: 0, extra: true },
  ])
    expect(isProjectBlockPattern({ ...base, fieldRanges: { SPEED: range } })).toBe(false)
  for (const text of [
    {},
    null,
    [],
    { nonBlank: false },
    { nonBlank: 'true' },
    { nonBlank: true, extra: 1 },
  ])
    expect(isProjectBlockPattern({ ...base, fieldText: { DESCRIPTION: text } })).toBe(false)
  const conditions = [
    { fields: { VALUE: 1 } },
    { fieldOptions: { VALUE: ['1'] } },
    { fieldRanges: { VALUE: { min: 0 } } },
    { fieldText: { VALUE: { nonBlank: true } } },
  ]
  for (let a = 0; a < conditions.length; a++)
    for (let b = a + 1; b < conditions.length; b++)
      expect(isProjectBlockPattern({ ...base, ...conditions[a], ...conditions[b] })).toBe(false)
  for (const key of ['fieldRanges', 'fieldText']) {
    const value = key === 'fieldRanges' ? { min: 0 } : { nonBlank: true }
    expect(isProjectBlockPattern({ ...base, [key]: { ' ': value } })).toBe(false)
    expect(
      isProjectBlockPattern({
        ...base,
        [key]: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`F${i}`, value])),
      }),
    ).toBe(false)
  }
})

test('new field criteria preserve recursion and total pattern budgets', () => {
  const leaf: ProjectBlockPattern = {
    blockType: 'move',
    fieldRanges: { SPEED: { min: 0 } },
    fieldText: { DESCRIPTION: { nonBlank: true } },
  }
  let nested = leaf
  for (let depth = 0; depth < 4; depth++)
    nested = { blockType: 'loop', inputBlocks: { BODY: nested } }
  expect(isProjectBlockPattern(nested)).toBe(true)
  expect(isProjectBlockPattern({ blockType: 'loop', inputBlocks: { BODY: nested } })).toBe(false)
  const branch = {
    blockType: 'loop',
    inputBlocks: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`B${i}`, leaf])),
  }
  expect(
    isProjectBlockPattern({ blockType: 'loop', inputBlocks: { A: branch, B: branch, C: branch } }),
  ).toBe(true)
  expect(
    isProjectBlockPattern({
      blockType: 'loop',
      inputBlocks: { A: branch, B: branch, C: branch, D: leaf },
    }),
  ).toBe(false)
  expect(
    isProjectBlockPattern({
      blockType: 'loop',
      inputBlocks: { BODY: { ...leaf, fieldRanges: { SPEED: {} } } },
    }),
  ).toBe(false)
})

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
