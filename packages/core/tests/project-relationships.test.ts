import { expect, test } from 'bun:test'
import {
  evaluateProjectStructure,
  isSectionCompletion,
  type SectionStructureRule,
} from '../src/learning'

const node = (type: string, inputs = {}, fields = {}) => ({ type, inputs, fields })
const project = (block: unknown) => ({
  blocksState: { blocks: { blocks: [node('sz_frame_loops', { CHILDREN: { block } })] } },
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
