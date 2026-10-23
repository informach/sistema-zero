import { expect, test } from 'bun:test'
import {
  assertStudioPythonActivityScope,
  gradeStudioPythonActivity,
  StudioPythonActivitySchema,
  verifyStudioPythonActivityFeedback,
} from './python-activity'

const definition = () => ({
  version: 1,
  programmingLanguage: 'python',
  profileId: 'python-browser',
  instructions: 'Desenhe e teste.',
  checks: [
    {
      id: 'loop',
      label: 'Use repetição',
      kind: 'structure',
      rule: { type: 'usesLoop' },
      weight: 2,
    },
    {
      id: 'output',
      label: 'Mostre a mensagem',
      kind: 'behavior',
      rule: { type: 'consoleContains', text: 'Olá!' },
    },
  ],
  passingScore: 70,
})

test('Python criteria are explicit and cannot absorb legacy JavaScript criteria', () => {
  const activity = StudioPythonActivitySchema.parse(definition())
  expect(activity.programmingLanguage).toBe('python')
  for (const raw of [
    { ...definition(), programmingLanguage: undefined },
    { ...definition(), profileId: undefined },
    { ...definition(), programmingLanguage: 'javascript' },
    {
      ...definition(),
      checks: [
        {
          id: 'dom',
          label: 'DOM',
          kind: 'behavior',
          rule: { type: 'domSelectorExists', selector: 'canvas' },
        },
      ],
    },
    {
      ...definition(),
      checks: [
        {
          id: 'block',
          label: 'Bloco',
          kind: 'structure',
          rule: { type: 'usesBlock', blockType: 'controls_if' },
        },
      ],
    },
    { ...definition(), source: 'return true' },
  ])
    expect(StudioPythonActivitySchema.safeParse(raw).success).toBe(false)
})

test('authored gates require structure even with rounded weighted scores', () => {
  expect(StudioPythonActivitySchema.safeParse({ ...definition(), passingScore: 33 }).success).toBe(
    false,
  )
  expect(StudioPythonActivitySchema.safeParse({ ...definition(), passingScore: 34 }).success).toBe(
    true,
  )
  expect(
    StudioPythonActivitySchema.safeParse({ ...definition(), checks: [], passingScore: 0 }).success,
  ).toBe(false)
  expect(
    StudioPythonActivitySchema.safeParse({ ...definition(), checks: [], passingScore: undefined })
      .success,
  ).toBe(true)
  const raw = definition()
  raw.checks[1]!.weight = 200
  expect(StudioPythonActivitySchema.safeParse(raw).success).toBe(false)
})

test('definitions reject duplicate identities, invalid weights and recipes', () => {
  const checks = definition().checks
  for (const raw of [
    { ...definition(), checks: [...checks, checks[0]] },
    { ...definition(), checks: checks.map((check) => ({ ...check, weight: 0 })) },
    { ...definition(), checks: checks.map((check) => ({ ...check, weight: NaN })) },
    { ...definition(), checks: checks.map((check) => ({ ...check, weight: Infinity })) },
    {
      ...definition(),
      checks: Array.from({ length: 51 }, (_, index) => ({ ...checks[0], id: `c${index}` })),
    },
    { ...definition(), recipe: { version: 1, observeMs: 100_000 } },
    { ...definition(), recipe: { version: 1, source: 'eval()' } },
    { ...definition(), recipe: { version: 1, stdin: ['two\nlines'] } },
  ])
    expect(StudioPythonActivitySchema.safeParse(raw).success).toBe(false)
})

test('iterative budget rejects cycles, depth and getters before recursive schemas', () => {
  let reads = 0
  const getter = Object.defineProperty({}, 'checks', {
    enumerable: true,
    get() {
      reads++
      return []
    },
  })
  const cycle: Record<string, unknown> = definition()
  cycle.self = cycle
  let deep: unknown = 'x'
  for (let index = 0; index < 30; index++) deep = [deep]
  for (const raw of [
    getter,
    cycle,
    { ...definition(), extra: deep },
    { ...definition(), instructions: 'x'.repeat(256_001) },
  ])
    expect(StudioPythonActivitySchema.safeParse(raw).success).toBe(false)
  expect(reads).toBe(0)
})

test('test cases retain typed JSON and normalize Python Unicode names without evaluating expressions', () => {
  const raw = {
    ...definition(),
    passingScore: undefined,
    checks: [
      {
        id: 'fn',
        label: 'Some',
        kind: 'testcase',
        functionName: 'ação',
        cases: [{ args: [true, 1, [null], { valor: 2 }], expected: false }],
      },
    ],
  }
  const parsed = StudioPythonActivitySchema.parse(raw)
  expect(parsed.checks[0]).toMatchObject({
    functionName: 'ação',
    cases: [{ args: [true, 1, [null], { valor: 2 }], expected: false }],
  })
  for (const value of [undefined, NaN, Infinity, 1n, () => true, new Date()]) {
    expect(
      StudioPythonActivitySchema.safeParse({
        ...raw,
        checks: [{ ...raw.checks[0], cases: [{ args: [], expected: value }] }],
      }).success,
    ).toBe(false)
  }
  for (const functionName of ['t.forward', 'x()', 'lambda: 1', 'a b'])
    expect(
      StudioPythonActivitySchema.safeParse({ ...raw, checks: [{ ...raw.checks[0], functionName }] })
        .success,
    ).toBe(false)
  const normalized = StudioPythonActivitySchema.parse({
    ...raw,
    checks: [{ ...raw.checks[0], functionName: 'K' }],
  })
  expect(normalized.checks[0]).toMatchObject({ functionName: 'K' })
  raw.checks[0]!.cases[0]!.args[0] = false
  expect(parsed.checks[0]).toMatchObject({ cases: [{ args: [true, 1, [null], { valor: 2 }] }] })
})

test('Turtle observation is explicit, profile scoped and requires the installed extension', () => {
  const activity = StudioPythonActivitySchema.parse({
    ...definition(),
    checks: [
      ...definition().checks,
      {
        id: 'position',
        label: 'Vá para o centro',
        kind: 'behavior',
        rule: {
          type: 'turtleState',
          predicate: { property: 'position', expected: [0, 0], tolerance: 0.01 },
        },
      },
    ],
  })
  const runtime = { profileId: activity.profileId }
  expect(() => assertStudioPythonActivityScope(activity, { runtime, extensions: [] })).toThrow(
    'Turtle',
  )
  expect(() =>
    assertStudioPythonActivityScope(activity, { runtime: { profileId: 'other' }, extensions: [] }),
  ).toThrow('perfil')
  expect(() =>
    assertStudioPythonActivityScope(activity, {
      runtime,
      extensions: [{ id: 'python-turtle', version: '1.0.0' }],
    }),
  ).not.toThrow()
  expect(() =>
    assertStudioPythonActivityScope(activity, {
      runtime,
      extensions: [{ id: 'python-turtle', version: '2.0.0' }],
    }),
  ).toThrow('Turtle')
})

test('worker feedback must match the exact ordered non-structural check set and cannot claim server verification', () => {
  const activity = StudioPythonActivitySchema.parse(definition())
  const ok = { checkId: 'output', kind: 'behavior', passed: true, verifiedBy: 'client' }
  expect(
    verifyStudioPythonActivityFeedback({ version: 1, results: [ok] }, activity).results,
  ).toHaveLength(1)
  for (const results of [
    [],
    [ok, ok],
    [{ ...ok, checkId: 'loop', kind: 'structure' }],
    [{ ...ok, kind: 'code' }],
    [{ ...ok, verifiedBy: 'server' }],
    [{ ...ok, message: 'x'.repeat(2001) }],
  ])
    expect(() => verifyStudioPythonActivityFeedback({ version: 1, results }, activity)).toThrow()
})

test('server grading ignores forged structure and labels browser behavior honestly', () => {
  const activity = StudioPythonActivitySchema.parse(definition())
  const clientResults = [
    { checkId: 'loop', passed: true },
    { checkId: 'output', passed: true },
  ]
  const failed = gradeStudioPythonActivity({
    activity,
    clientResults,
    structureVerifiedBy: 'server',
    evaluateStructure: () => false,
  })
  expect(failed).toMatchObject({
    score: 33,
    passed: false,
    results: [
      { checkId: 'loop', passed: false, verifiedBy: 'server' },
      { checkId: 'output', passed: true, verifiedBy: 'client' },
    ],
  })
  const passed = gradeStudioPythonActivity({
    activity,
    clientResults,
    structureVerifiedBy: 'client',
    evaluateStructure: () => true,
  })
  expect(passed).toMatchObject({
    score: 100,
    passed: true,
    results: [{ verifiedBy: 'client' }, { verifiedBy: 'client' }],
  })
  expect(
    gradeStudioPythonActivity({
      activity,
      clientResults: [],
      structureVerifiedBy: 'server',
      evaluateStructure: () => true,
    }),
  ).toMatchObject({ score: 67, passed: false })
})

test('structure names follow CPython NFKC normalization, including attribute call targets', () => {
  const activity = StudioPythonActivitySchema.parse({
    ...definition(),
    checks: [
      {
        id: 'variable',
        label: 'Variável',
        kind: 'structure',
        rule: { type: 'declaresVariable', name: 'K' },
      },
      {
        id: 'function',
        label: 'Função',
        kind: 'structure',
        rule: { type: 'definesFunction', name: 'cafe\u0301' },
      },
      {
        id: 'call',
        label: 'Chamada',
        kind: 'structure',
        rule: { type: 'callsFunction', name: 'K.cafe\u0301' },
      },
    ],
  })
  expect(activity.checks.map((check) => (check.kind === 'structure' ? check.rule : null))).toEqual([
    { type: 'declaresVariable', name: 'K' },
    { type: 'definesFunction', name: 'café' },
    { type: 'callsFunction', name: 'K.café' },
  ])
})

test('literal Python dictionaries preserve special keys in arguments, expected values and globals', () => {
  const value: unknown = JSON.parse('{"__proto__":{"safe":true},"constructor":2,"toString":3}')
  const activity = StudioPythonActivitySchema.parse({
    ...definition(),
    passingScore: undefined,
    checks: [
      {
        id: 'fn',
        label: 'Dicionário',
        kind: 'testcase',
        functionName: 'echo',
        cases: [{ args: [value], expected: value }],
      },
      {
        id: 'global',
        label: 'Global',
        kind: 'behavior',
        rule: { type: 'globalEquals', name: 'data', value },
      },
    ],
  })
  const fn = activity.checks[0]
  const global = activity.checks[1]
  if (fn?.kind !== 'testcase' || global?.kind !== 'behavior' || global.rule.type !== 'globalEquals')
    throw new Error('Fixture inválida.')
  for (const parsed of [fn.cases[0]?.args[0], fn.cases[0]?.expected, global.rule.value]) {
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(value))
    if (!parsed || typeof parsed !== 'object') throw new Error('Fixture JSON sem dicionário.')
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype)
    expect(Object.hasOwn(parsed, '__proto__')).toBe(true)
  }
  expect(Object.prototype).not.toHaveProperty('safe')
})
