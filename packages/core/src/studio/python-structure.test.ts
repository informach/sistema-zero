import { expect, test } from 'bun:test'
import {
  type StudioPythonStructureFacts,
  StudioPythonStructureFactsSchema,
} from './python-structure'
import { STUDIO_PYTHON_STRUCTURE_LIMITS as limits } from './python-structure-limits'

const empty = (): StudioPythonStructureFacts => ({
  version: 1,
  nodesVisited: 1,
  usesLoop: false,
  usesConditional: false,
  assignedNames: [],
  definedFunctions: [],
  callTargets: [],
})

test('structure preserves explicit empty facts and detached syntax; it does not infer aliases', () => {
  expect(StudioPythonStructureFactsSchema.parse(empty())).toEqual(empty())
  const facts = StudioPythonStructureFactsSchema.parse({
    ...empty(),
    nodesVisited: 25,
    usesLoop: true,
    assignedNames: ['t', 'ação'],
    definedFunctions: ['jogar'],
    callTargets: ['t.forward'],
  })
  expect(facts.callTargets).toEqual(['t.forward'])
  expect(facts).not.toHaveProperty('verifiedBy')
})

test('structure rejects partial, duplicated, unbounded and authority-bearing evidence', () => {
  for (const raw of [
    {},
    { ...empty(), version: 2 },
    { ...empty(), nodesVisited: 0 },
    { ...empty(), nodesVisited: limits.nodes + 1 },
    { ...empty(), assignedNames: ['a', 'a'] },
    { ...empty(), definedFunctions: [''] },
    { ...empty(), assignedNames: ['x'.repeat(limits.nameChars + 1)] },
    { ...empty(), callTargets: ['x'.repeat(limits.callTargetChars + 1)] },
    { ...empty(), usesLoop: undefined },
    { ...empty(), complete: false },
    { ...empty(), verifiedBy: 'server' },
    {
      ...empty(),
      assignedNames: Array.from({ length: limits.namesPerCategory + 1 }, (_, i) => `v${i}`),
    },
    { ...empty(), assignedNames: Array.from({ length: 1000 }, (_, i) => 'ação'.repeat(40) + i) },
  ])
    expect(StudioPythonStructureFactsSchema.safeParse(raw).success).toBe(false)
})

test('a reader detaches evidence from mutable input', () => {
  const raw = { ...empty(), assignedNames: ['original'] }
  const parsed = StudioPythonStructureFactsSchema.parse(raw)
  raw.assignedNames[0] = 'late'
  expect(parsed.assignedNames).toEqual(['original'])
})
