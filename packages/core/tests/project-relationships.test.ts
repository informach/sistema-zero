import { expect, test } from 'bun:test'
import {
  defaultLessonSection,
  evaluateProjectStructure,
  isProjectBlockPattern,
  isSectionCompletion,
  type ProjectBlockPattern,
  type SectionStructureRule,
  sectionCompletionIssues,
} from '../src/learning'

const node = (type: string, inputs = {}, fields = {}) => ({ type, inputs, fields })
const project = (block: unknown) => ({
  blocksState: { blocks: { blocks: [node('sz_frame_loops', { CHILDREN: { block } })] } },
})

test('beforePattern identifies the complete later sibling, never an unrelated if or another branch', () => {
  const victory = node('if', { COND: { block: node('variable', {}, { NAME: 'pontos' }) } })
  const defeat = node('if', { COND: { block: node('variable', {}, { NAME: 'vida' }) } })
  const rule: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'if',
    inputBlocks: { COND: { blockType: 'variable', fields: { NAME: 'vida' } } },
    beforePattern: {
      blockType: 'if',
      inputBlocks: { COND: { blockType: 'variable', fields: { NAME: 'pontos' } } },
    },
  }
  expect(evaluateProjectStructure(rule, project({ ...defeat, next: { block: victory } }))).toBe(
    true,
  )
  expect(
    evaluateProjectStructure(
      rule,
      project({ ...victory, next: { block: { ...defeat, next: { block: node('if') } } } }),
    ),
  ).toBe(false)
  expect(
    evaluateProjectStructure(
      rule,
      project({ ...defeat, next: { block: { ...victory, disabled: true } } }),
    ),
  ).toBe(false)
  expect(
    evaluateProjectStructure(
      rule,
      project(node('if', { THEN: { block: defeat }, ELSE: { block: victory } })),
    ),
  ).toBe(false)
  expect(
    evaluateProjectStructure(
      rule,
      project({ ...defeat, next: { block: node('if', { THEN: { block: victory } }) } }),
    ),
  ).toBe(false)
  expect(
    evaluateProjectStructure(
      rule,
      project({
        ...defeat,
        next: { block: { ...node('noop'), disabled: true, next: { block: victory } } },
      }),
    ),
  ).toBe(true)
})

test('beforePattern shares recursive budgets and is exclusive with beforeBlock', () => {
  const leaf: ProjectBlockPattern = { blockType: 'x' }
  expect(isProjectBlockPattern({ ...leaf, beforeBlock: 'y', beforePattern: leaf })).toBe(false)
  expect(isProjectBlockPattern({ ...leaf, beforePattern: null })).toBe(false)
  let nested = leaf
  for (let depth = 0; depth < 4; depth++) nested = { blockType: 'x', beforePattern: nested }
  expect(isProjectBlockPattern(nested)).toBe(true)
  expect(isProjectBlockPattern({ blockType: 'x', inputBlocks: { BODY: nested } })).toBe(false)
  const twenty = Array.from({ length: 20 }, () => leaf)
  const full = {
    blockType: 'x',
    inputBlocksAll: { A: twenty, B: twenty, C: twenty, D: [leaf, leaf] },
    beforePattern: leaf,
  }
  expect(isProjectBlockPattern(full)).toBe(true)
  expect(
    isProjectBlockPattern({
      ...full,
      inputBlocksAll: { ...full.inputBlocksAll, D: [leaf, leaf, leaf] },
    }),
  ).toBe(false)
})

test('blank beforePattern stays an editorial draft and prevents publication', () => {
  const completion = {
    version: 1 as const,
    blockIds: [],
    projectChecks: [
      {
        id: 'order',
        label: 'Ordem',
        rule: { type: 'usesBlock' as const, blockType: 'if', beforePattern: { blockType: '' } },
      },
    ],
  }
  expect(isSectionCompletion(completion)).toBe(true)
  const section = {
    ...defaultLessonSection('section', 'Montar', ['studio']),
    workspaceBlockId: 'studio',
    completion,
  }
  expect(
    sectionCompletionIssues(
      [section],
      [{ id: 'studio', content: { kind: 'studio', purpose: 'experiment' } }],
    ).some((issue) => issue.message.includes('Preencha o objetivo')),
  ).toBe(true)
})

test('beforePattern searches spend the same bounded evaluation budget as AND sockets', () => {
  const rule: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'event',
    inputBlocksAll: {
      BODY: Array.from({ length: 20 }, () => ({
        blockType: 'begin',
        beforePattern: { blockType: 'end' },
      })),
    },
  }
  const event = (chain: unknown) => project(node('event', { BODY: { block: chain } }))
  expect(
    evaluateProjectStructure(rule, event({ ...node('begin'), next: { block: node('end') } })),
  ).toBe(true)
  let chain: unknown = node('end')
  for (let i = 0; i < 6000; i++) chain = { ...node('middle'), next: { block: chain } }
  expect(evaluateProjectStructure(rule, event({ ...node('begin'), next: { block: chain } }))).toBe(
    false,
  )
})

test('correlated alternatives match a complete pair on the same block, never the cross product', () => {
  const rule: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'overlap',
    fieldAlternatives: [
      { A: 'personagem', B: 'chave' },
      { A: 'chave', B: 'personagem' },
    ],
  }
  for (const fields of rule.fieldAlternatives ?? [])
    expect(evaluateProjectStructure(rule, project(node('overlap', {}, fields)))).toBe(true)
  for (const fields of [
    { A: 'chave', B: 'chave' },
    { A: 'personagem', B: 'personagem' },
    { A: 'personagem' },
  ])
    expect(evaluateProjectStructure(rule, project(node('overlap', {}, fields)))).toBe(false)
  expect(
    evaluateProjectStructure(
      rule,
      project({
        ...node('overlap', {}, { A: 'personagem' }),
        next: { block: node('overlap', {}, { B: 'chave' }) },
      }),
    ),
  ).toBe(false)
})

test('AND checks belong to one event and one socket chain, including reversed action order', () => {
  const rule: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'overlap',
    inputBlocksAll: {
      BODY: [{ blockType: 'destroy' }, { blockType: 'assign', fields: { NAME: 'temChave' } }],
    },
  }
  const destroy = node('destroy'),
    assign = node('assign', {}, { NAME: 'temChave' })
  const event = (body: unknown, other?: unknown) =>
    node('overlap', { BODY: { block: body }, OTHER: { block: other } })
  for (const [first, last] of [
    [destroy, assign],
    [assign, destroy],
  ])
    expect(
      evaluateProjectStructure(rule, project(event({ ...first, next: { block: last } }))),
    ).toBe(true)
  for (const bad of [
    event(destroy, assign),
    { ...event(destroy), next: { block: event(assign) } },
    event({ ...destroy, next: { block: { ...assign, disabled: true } } }),
    event({ ...destroy, next: { block: node('if', { THEN: { block: assign } }) } }),
    { ...event({ ...destroy, next: { block: assign } }), disabled: true },
  ])
    expect(evaluateProjectStructure(rule, project(bad))).toBe(false)
  expect(
    evaluateProjectStructure(
      { ...rule, inputBlocksAll: { BODY: [{ blockType: 'destroy' }, { blockType: 'destroy' }] } },
      project(event(destroy)),
    ),
  ).toBe(true)
})

test('alternatives and AND sockets reject malformed, conflicting or unbounded criteria', () => {
  const base = { blockType: 'overlap' }
  for (const fieldAlternatives of [
    [],
    [{}],
    [{ A: 'p' }, { B: 'k' }],
    [{ A: Infinity }],
    [{ A: null }],
    [{ ' ': 'p' }],
    [{ A: 'x'.repeat(201) }],
    Array.from({ length: 11 }, () => ({ A: 'p' })),
    [Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`F${i}`, i]))],
  ])
    expect(isProjectBlockPattern({ ...base, fieldAlternatives })).toBe(false)
  for (const constraint of [
    { fields: { A: 'p' } },
    { fieldOptions: { A: ['p'] } },
    { fieldRanges: { A: { min: 0 } } },
    { fieldText: { A: { nonBlank: true } } },
  ])
    expect(isProjectBlockPattern({ ...base, fieldAlternatives: [{ A: 'p' }], ...constraint })).toBe(
      false,
    )
  for (const inputBlocksAll of [
    { BODY: [] },
    { BODY: {} },
    { BODY: [{ blockType: 1 }] },
    { ' ': [{ blockType: 'x' }] },
    { BODY: Array.from({ length: 21 }, () => ({ blockType: 'x' })) },
    Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`S${i}`, [{ blockType: 'x' }]])),
  ])
    expect(isProjectBlockPattern({ ...base, inputBlocksAll })).toBe(false)
  for (const conflict of [{ inputs: { BODY: 1 } }, { inputBlocks: { BODY: { blockType: 'x' } } }])
    expect(
      isProjectBlockPattern({
        ...base,
        inputBlocksAll: { BODY: [{ blockType: 'x' }] },
        ...conflict,
      }),
    ).toBe(false)
})

test('both socket forms share the same 64-node and depth-four validation budgets', () => {
  const leaf: ProjectBlockPattern = { blockType: 'x' }
  const twenty = Array.from({ length: 20 }, () => leaf)
  const pattern: ProjectBlockPattern = {
    blockType: 'root',
    inputBlocks: { ONE: leaf },
    inputBlocksAll: { A: twenty, B: twenty, C: twenty, D: [leaf, leaf] },
  }
  expect(isProjectBlockPattern(pattern)).toBe(true)
  expect(
    isProjectBlockPattern({
      ...pattern,
      inputBlocksAll: { ...pattern.inputBlocksAll, D: [leaf, leaf, leaf] },
    }),
  ).toBe(false)
  let nested = leaf
  for (let i = 0; i < 4; i++)
    nested =
      i % 2
        ? { blockType: 'x', inputBlocks: { BODY: nested } }
        : { blockType: 'x', inputBlocksAll: { BODY: [nested] } }
  expect(isProjectBlockPattern(nested)).toBe(true)
  expect(isProjectBlockPattern({ blockType: 'x', inputBlocksAll: { BODY: [nested] } })).toBe(false)
})

test('AND searches spend the shared evaluation budget instead of resetting it per requirement', () => {
  let chain: unknown = node('end')
  for (let i = 0; i < 6000; i++) chain = { ...node('middle'), next: { block: chain } }
  const rule: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'event',
    inputBlocksAll: { BODY: Array.from({ length: 20 }, () => ({ blockType: 'end' })) },
  }
  expect(
    evaluateProjectStructure(rule, project(node('event', { BODY: { block: node('end') } }))),
  ).toBe(true)
  expect(evaluateProjectStructure(rule, project(node('event', { BODY: { block: chain } })))).toBe(
    false,
  )
})

test('a placeholder inside an AND chain remains a draft but blocks publication', () => {
  const rule: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'event',
    inputBlocksAll: { BODY: [{ blockType: '' }] },
  }
  const completion = {
    version: 1 as const,
    blockIds: [],
    projectChecks: [{ id: 'check', label: 'Conferir', rule }],
  }
  expect(isSectionCompletion(completion)).toBe(true)
  const section = {
    ...defaultLessonSection('section', 'Montar', ['studio']),
    workspaceBlockId: 'studio',
    completion,
  }
  const issues = sectionCompletionIssues(
    [section],
    [{ id: 'studio', content: { kind: 'studio', purpose: 'experiment' } }],
  )
  expect(issues.some((issue) => issue.message.includes('Preencha o objetivo'))).toBe(true)
})
test('order stays in the same enabled sibling chain', () => {
  const rule: SectionStructureRule = { type: 'usesBlock', blockType: 'forest', beforeBlock: 'draw' }
  expect(
    evaluateProjectStructure(rule, project({ ...node('forest'), next: { block: node('draw') } })),
  ).toBe(true)
  expect(
    evaluateProjectStructure(rule, project({ ...node('draw'), next: { block: node('forest') } })),
  ).toBe(false)
  expect(
    evaluateProjectStructure(
      rule,
      project(node('if', { THEN: { block: node('forest') }, ELSE: { block: node('draw') } })),
    ),
  ).toBe(false)
  expect(
    evaluateProjectStructure(
      rule,
      project({ ...node('forest'), next: { block: { ...node('draw'), disabled: true } } }),
    ),
  ).toBe(false)
})
test('removal and exact counts handle active duplicates and malformed state', () => {
  const zero: SectionStructureRule = { type: 'usesBlock', blockType: 'key', count: 0 }
  expect(evaluateProjectStructure(zero, project(node('jump')))).toBe(true)
  expect(evaluateProjectStructure(zero, project(node('key')))).toBe(false)
  expect(evaluateProjectStructure(zero, project({ ...node('key'), disabled: true }))).toBe(true)
  expect(evaluateProjectStructure(zero, {})).toBe(false)
  expect(
    evaluateProjectStructure(
      { ...zero, count: 1 },
      project({ ...node('key'), next: { block: node('key') } }),
    ),
  ).toBe(false)
})
test('a condition and its action must belong to the same branch owner', () => {
  const rule: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'if',
    inputBlocks: {
      COND: { blockType: 'scene', fields: { SCENE: 'jogando' } },
      THEN: { blockType: 'spawn' },
    },
  }
  const condition = { block: node('scene', {}, { SCENE: 'jogando' }) }
  expect(
    evaluateProjectStructure(
      rule,
      project(node('if', { COND: condition, THEN: { block: node('spawn') } })),
    ),
  ).toBe(true)
  expect(
    evaluateProjectStructure(
      rule,
      project(node('if', { COND: condition, ELSE: { block: node('spawn') } })),
    ),
  ).toBe(false)
  expect(
    evaluateProjectStructure(
      rule,
      project({
        ...node('if', { COND: condition }),
        next: { block: node('if', { THEN: { block: node('spawn') } }) },
      }),
    ),
  ).toBe(false)
})
test('nested expressions must feed the right input, ignoring replaced shadows', () => {
  const rule: SectionStructureRule = {
    type: 'usesBlock',
    blockType: 'spawn',
    inputBlocks: {
      VX: {
        blockType: 'subtract',
        inputBlocks: { A: { blockType: 'variable', fields: { NAME: 'velocidade' } } },
      },
    },
  }
  const formula = node('subtract', { A: { block: node('variable', {}, { NAME: 'velocidade' }) } })
  expect(evaluateProjectStructure(rule, project(node('spawn', { VX: { block: formula } })))).toBe(
    true,
  )
  expect(evaluateProjectStructure(rule, project(node('spawn', { X: { block: formula } })))).toBe(
    false,
  )
  expect(
    evaluateProjectStructure(
      rule,
      project(
        node('spawn', { VX: { shadow: formula, block: node('sz_val_number', {}, { NUM: -5 }) } }),
      ),
    ),
  ).toBe(false)
})
test('patterns reject excessive nesting and contradictory literal and block requirements', () => {
  const completion = (rule: unknown) => ({
    version: 1,
    blockIds: [],
    projectChecks: [{ id: 'one', label: 'Check', rule }],
  })
  expect(
    isSectionCompletion(completion({ type: 'usesBlock', blockType: 'spawn', count: -1 })),
  ).toBe(false)
  expect(
    isSectionCompletion(
      completion({
        type: 'usesBlock',
        blockType: 'spawn',
        inputs: { X: 5 },
        inputBlocks: { X: { blockType: 'random' } },
      }),
    ),
  ).toBe(false)
  let pattern: Record<string, unknown> = { blockType: 'x' }
  for (let i = 0; i < 5; i++) pattern = { blockType: 'x', inputBlocks: { A: pattern } }
  expect(isSectionCompletion(completion({ ...pattern, type: 'usesBlock' }))).toBe(false)
})

test('an ordered command inside a named branch must precede its sibling in that branch', () => {
  const rule = {
    type: 'usesBlock',
    blockType: 'if',
    inputBlocks: { THEN: { blockType: 'gravity', beforeBlock: 'control' } },
  } as const
  expect(
    evaluateProjectStructure(
      rule,
      project(
        node('if', {
          THEN: { block: { ...node('gravity'), next: { block: node('control') } } },
        }),
      ),
    ),
  ).toBe(true)
  expect(
    evaluateProjectStructure(
      rule,
      project(
        node('if', {
          THEN: { block: { ...node('control'), next: { block: node('gravity') } } },
        }),
      ),
    ),
  ).toBe(false)
  expect(
    evaluateProjectStructure(
      rule,
      project(
        node('if', {
          THEN: { block: node('gravity') },
          ELSE: { block: node('control') },
        }),
      ),
    ),
  ).toBe(false)
})
