import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  judgePythonProjectExecution,
  preparePythonProjectExecution,
} from '@sistemazero/core/learning'

const script = fileURLToPath(
  new URL('../../../scripts/tests/python_mission_observer_test.py', import.meta.url),
)
function python() {
  for (const command of ['python3', 'python']) {
    const result = spawnSync(
      command,
      ['-I', '-B', '-c', 'import sys; print(sys.version_info >= (3, 12))'],
      {
        encoding: 'utf8',
        timeout: 2000,
      },
    )
    if (result.status === 0 && result.stdout.trim() === 'True') return command
  }
  throw new Error('Os testes das observações de missão precisam de CPython 3.12 ou mais novo.')
}
const binding = () => ({
  projectId: 'mission_project',
  revision: 'a'.repeat(64),
  runtimeManifestSha256: 'b'.repeat(64),
  runId: crypto.randomUUID(),
})

test('known Python programs actually run before their observations reach the canonical judge', async () => {
  // No arbitrary source or user files: the native process runs fixed local QA fixtures only.
  const run = spawnSync(python(), ['-I', '-B', script, '--observations'], {
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 128_000,
  })
  expect(run.status).toBe(0)
  expect(run.stderr).toBe('')
  const observed = JSON.parse(run.stdout)
  const plan = await preparePythonProjectExecution(binding(), [
    {
      id: 'calculo',
      rule: {
        type: 'functionReturns',
        name: 'somar',
        cases: [
          { args: [2, 3], expected: 5 },
          { args: [-1, 1], expected: 0 },
        ],
      },
    },
  ])
  for (const [name, passed] of [
    ['good', true],
    ['wrong', false],
  ] as const) {
    expect(
      judgePythonProjectExecution(plan, {
        version: 1,
        identity: plan.identity,
        observations: [observed[name]],
      })[0]!.passed,
    ).toBe(passed)
  }
  const effect = await preparePythonProjectExecution(binding(), [
    {
      id: 'pontos',
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'value', path: 'pontos' }, compare: 'atLeast', value: 10 },
      },
    },
  ])
  expect(
    judgePythonProjectExecution(effect, {
      version: 1,
      identity: effect.identity,
      observations: [{ id: 'pontos', type: 'behavior', final: observed.deadBranch }],
    })[0]!.passed,
  ).toBe(false)
}, 20_000)

test('the native observation adapter covers exceptions, copies, modules, await and bounded JSON', () => {
  const run = spawnSync(python(), ['-I', '-B', script], {
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 128_000,
  })
  expect(run.status).toBe(0)
  expect(run.stderr).toContain('Ran 7 tests')
  expect(run.stderr).toContain('OK')
}, 20_000)
