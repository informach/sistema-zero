import { expect, test } from 'bun:test'
import { isExecutionModulePath, isSectionExecutionRule } from '../src/learning/project-execution'
import {
  isPythonProjectExecutionRule,
  judgePythonProjectExecution,
  type PythonProjectExecutionObjective,
  preparePythonProjectExecution,
  pythonProjectExecutionProbes,
} from '../src/learning/python-project-execution'

const identity = () => ({
  projectId: 'mission_project',
  revision: 'a'.repeat(64),
  runtimeManifestSha256: 'b'.repeat(64),
  runId: crypto.randomUUID(),
})
const consoleObjective = (): PythonProjectExecutionObjective => ({
  id: 'mensagem',
  rule: {
    type: 'behavior',
    steps: [{ action: 'wait', ms: 100 }],
    expect: {
      target: { kind: 'console' },
      compare: 'contains',
      value: 'resultado esperado privado',
    },
  },
})
const functionObjective = (): PythonProjectExecutionObjective => ({
  id: 'calculo',
  rule: {
    type: 'functionReturns',
    name: 'somar',
    module: 'regras.py',
    cases: [
      { args: [2, 3], expected: 5 },
      { args: [-1, 1], expected: 0 },
    ],
  },
})

test('Python function modules are validated as Python without broadening JavaScript', () => {
  const rule = functionObjective().rule
  expect(isPythonProjectExecutionRule(rule)).toBe(true)
  expect(isSectionExecutionRule(rule)).toBe(false)
  expect(isExecutionModulePath('regras.py')).toBe(false)
  expect(isExecutionModulePath('regras.py', 'python')).toBe(true)
  expect(isExecutionModulePath('../regras.py', 'python')).toBe(false)
  expect(isExecutionModulePath('regras.ts', 'python')).toBe(false)
  expect(isExecutionModulePath('src/regras.ts')).toBe(true)
  expect(isPythonProjectExecutionRule({ ...rule, name: 'pontuação' })).toBe(true)
  expect(isPythonProjectExecutionRule({ ...rule, name: 'x()' })).toBe(false)
  expect(
    isPythonProjectExecutionRule({
      type: 'behavior',
      steps: [],
      expect: {
        target: { kind: 'value', path: 'pontuação' },
        compare: 'atLeast',
        value: 1,
      },
    }),
  ).toBe(true)
  expect(
    isPythonProjectExecutionRule({
      type: 'behavior',
      steps: [],
      expect: {
        target: { kind: 'value', path: '$js' },
        compare: 'atLeast',
        value: 1,
      },
    }),
  ).toBe(false)
})

test('execution probes contain actions and arguments, never answers or comparisons', async () => {
  const plan = await preparePythonProjectExecution(identity(), [
    consoleObjective(),
    functionObjective(),
  ])
  const probes = pythonProjectExecutionProbes(plan)
  expect(probes).toEqual([
    {
      id: 'mensagem',
      type: 'behavior',
      steps: [{ action: 'wait', ms: 100 }],
      target: { kind: 'console' },
    },
    {
      id: 'calculo',
      type: 'functionReturns',
      name: 'somar',
      module: 'regras.py',
      args: [
        [2, 3],
        [-1, 1],
      ],
    },
  ])
  expect(JSON.stringify(probes)).not.toContain('esperado privado')
  expect(JSON.stringify(probes)).not.toContain('expected')
  expect(JSON.stringify(probes)).not.toContain('compare')
  expect(JSON.stringify(probes)).not.toContain('objectivesSha256')
})

test('the host judges observed output and function returns with the canonical ruler', async () => {
  const plan = await preparePythonProjectExecution(identity(), [
    consoleObjective(),
    functionObjective(),
  ])
  const report = {
    version: 1,
    identity: plan.identity,
    observations: [
      {
        id: 'mensagem',
        type: 'behavior',
        final: { found: true, value: 'resultado esperado privado' },
      },
      {
        id: 'calculo',
        type: 'functionReturns',
        cases: [
          { ok: true, value: 5 },
          { ok: true, value: 0 },
        ],
      },
    ],
  }
  expect(judgePythonProjectExecution(plan, report).map((item) => item.passed)).toEqual([true, true])
  report.observations[1]!.cases![1]!.value = 99
  expect(judgePythonProjectExecution(plan, report).map((item) => item.passed)).toEqual([
    true,
    false,
  ])
  report.observations[0]!.final!.value = 'ramo que de fato rodou'
  expect(judgePythonProjectExecution(plan, report).map((item) => item.passed)).toEqual([
    false,
    false,
  ])
})

test('missing, duplicated, stale and forged verdicts cannot supply execution evidence', async () => {
  const plan = await preparePythonProjectExecution(identity(), [consoleObjective()])
  const observation = {
    id: 'mensagem',
    type: 'behavior',
    final: { found: true, value: 'resultado esperado privado' },
  }
  const report = { version: 1, identity: plan.identity, observations: [observation] }
  for (const raw of [
    { ...report, observations: [] },
    { ...report, observations: [observation, observation] },
    { ...report, observations: [{ ...observation, id: 'outro' }] },
    { ...report, observations: [{ ...observation, passed: true }] },
    { ...report, observations: [{ ...observation, type: 'structure' }] },
    { ...report, identity: { ...plan.identity, revision: 'c'.repeat(64) } },
    { ...report, identity: { ...plan.identity, runId: crypto.randomUUID() } },
    { ...report, identity: { ...plan.identity, objectivesSha256: 'd'.repeat(64) } },
  ])
    expect(() => judgePythonProjectExecution(plan, raw)).toThrow()
})

test('runtime errors fail the objective; incomplete observations fail the operation', async () => {
  const plan = await preparePythonProjectExecution(identity(), [consoleObjective()])
  const report = {
    version: 1,
    identity: plan.identity,
    observations: [
      {
        id: 'mensagem',
        type: 'behavior',
        final: { found: true, value: 'resultado esperado privado' },
        errors: ['ValueError'],
      },
    ],
  }
  expect(judgePythonProjectExecution(plan, report)[0]!.passed).toBe(false)
  expect(() =>
    judgePythonProjectExecution(plan, {
      ...report,
      observations: [{ id: 'mensagem', type: 'behavior' }],
    }),
  ).toThrow()
  const functions = await preparePythonProjectExecution(identity(), [functionObjective()])
  expect(() =>
    judgePythonProjectExecution(functions, {
      version: 1,
      identity: functions.identity,
      observations: [{ id: 'calculo', type: 'functionReturns', cases: [{ ok: true, value: 5 }] }],
    }),
  ).toThrow()
})

test('capture precedes asynchronous hashing and probes cannot mutate the authored criteria', async () => {
  const source = consoleObjective()
  const binding = identity()
  const pending = preparePythonProjectExecution(binding, [source])
  source.id = 'mutated'
  binding.revision = 'e'.repeat(64)
  const plan = await pending
  expect(plan.objectives[0]!.id).toBe('mensagem')
  expect(plan.identity.revision).toBe('a'.repeat(64))
  expect(Object.isFrozen(plan)).toBe(true)
  expect(Object.isFrozen(plan.objectives[0]!.rule)).toBe(true)
  const probes = pythonProjectExecutionProbes(plan)
  probes[0]!.id = 'outro'
  expect(plan.objectives[0]!.id).toBe('mensagem')
})

test('direction checks accept different coherent speeds and reject wrong or idle motion', async () => {
  const objective: PythonProjectExecutionObjective = {
    id: 'subir',
    rule: {
      type: 'behavior',
      steps: [{ action: 'press', key: 'ArrowUp', holdMs: 100 }],
      expect: {
        target: { kind: 'spritePosition', path: 'heroi', axis: 'y' },
        compare: 'increased',
      },
      observation: { type: 'idleBeforeAction', idleMs: 100 },
    },
  }
  const plan = await preparePythonProjectExecution(identity(), [objective])
  const sample = (y: number, frame: number) => ({
    x: 0,
    y,
    frame,
    generation: 1,
    errors: 0,
    paused: false,
  })
  for (const delta of [3, 9, -3, 0]) {
    const result = judgePythonProjectExecution(plan, {
      version: 1,
      identity: plan.identity,
      observations: [
        {
          id: 'subir',
          type: 'behavior',
          initial: { found: true, value: 0 },
          final: { found: true, value: delta },
          motion: {
            baselineInitial: sample(0, 1),
            baselineFinal: sample(0, 2),
            actionInitial: sample(0, 2),
            actionFinal: sample(delta, 3),
          },
        },
      ],
    })
    expect(result[0]!.passed).toBe(delta > 0)
  }
})

test('an omitted initial value is not evidence that a value changed', async () => {
  const plan = await preparePythonProjectExecution(identity(), [
    {
      id: 'alterou',
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'value', path: 'pontos' }, compare: 'changed' },
      },
    },
  ])
  expect(() =>
    judgePythonProjectExecution(plan, {
      version: 1,
      identity: plan.identity,
      observations: [
        {
          id: 'alterou',
          type: 'behavior',
          initial: { found: true },
          final: { found: true, value: 2 },
        },
      ],
    }),
  ).toThrow()
})

test('a function cannot report success alongside an exception or omitted return value', async () => {
  const plan = await preparePythonProjectExecution(identity(), [functionObjective()])
  for (const first of [{ ok: true, value: 5, error: 'ValueError' }, { ok: true }]) {
    expect(() =>
      judgePythonProjectExecution(plan, {
        version: 1,
        identity: plan.identity,
        observations: [
          { id: 'calculo', type: 'functionReturns', cases: [first, { ok: true, value: 0 }] },
        ],
      }),
    ).toThrow()
  }
})

test('unsupported JavaScript semantics and excessive objective budgets are rejected', async () => {
  expect(isPythonProjectExecutionRule({ type: 'script', steps: [], code: 'return true' })).toBe(
    false,
  )
  const rule = consoleObjective().rule
  if (rule.type !== 'behavior') throw new Error('fixture')
  for (const target of [{ kind: 'text' }, { kind: 'game', field: 'score' }])
    expect(isPythonProjectExecutionRule({ ...rule, expect: { ...rule.expect, target } })).toBe(
      false,
    )
  await expect(
    preparePythonProjectExecution(identity(), [consoleObjective(), consoleObjective()]),
  ).rejects.toThrow()
  await expect(
    preparePythonProjectExecution(
      identity(),
      Array.from({ length: 9 }, (_, index) => ({ ...consoleObjective(), id: `id${index}` })),
    ),
  ).rejects.toThrow()
})
