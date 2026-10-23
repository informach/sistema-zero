import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Frame } from '@playwright/test'
import { assertRun, deadline } from './checks.ts'

export async function qualifyInput(frame: Frame, evidence: Record<string, unknown>) {
  const source = await readFile(resolve(import.meta.dirname, 'fixtures/input.py'), 'utf8')
  await frame.evaluate((code) => {
    globalThis.l0.interactiveRun = undefined
    globalThis.l0.run(code).then((result) => {
      globalThis.l0.interactiveRun = result
    })
  }, source)
  for (const line of ['João', '3']) {
    await frame.waitForFunction(() => globalThis.l0.state.inputId !== null, undefined, {
      timeout: 5000,
    })
    assert.equal(
      await frame.evaluate(() => globalThis.l0.graphics()),
      null,
      'Input must not create a graphics renderer',
    )
    await frame.evaluate((value) => globalThis.l0.submitLine(value), line)
  }
  await frame.waitForFunction(() => globalThis.l0.interactiveRun !== undefined, undefined, {
    timeout: 5000,
  })
  const input = await frame.evaluate(() => ({
    result: globalThis.l0.interactiveRun,
    output: [...globalThis.l0.state.events],
  }))
  evidence.input = input
  assert.ok(input.result)
  assertRun({ result: input.result, output: input.output }, [
    'ready-for-input',
    '{"name": "João", "count": 3}',
  ])

  await frame.evaluate(() => {
    globalThis.l0.stoppedRun = undefined
    globalThis.l0.run('input()').then((result) => {
      globalThis.l0.stoppedRun = result
    })
  })
  await frame.waitForFunction(() => globalThis.l0.state.inputId !== null, undefined, {
    timeout: 5000,
  })
  const stopMs = await deadline(
    frame.evaluate(() => globalThis.l0.stop()),
    2000,
    'Stop stdin',
  )
  evidence.stopMs = stopMs
  assert.ok(stopMs <= 250)
  assert.equal((await frame.evaluate(() => globalThis.l0.stoppedRun))?.error, 'stopped')
  assert.equal(await frame.evaluate(() => globalThis.l0.state.inputId), null)
  await frame.evaluate(() => globalThis.l0.start())
  await frame.waitForFunction(
    () => ['ready', 'failed'].includes(globalThis.l0.state.status),
    undefined,
    { timeout: 30000 },
  )
  assert.equal(await frame.evaluate(() => globalThis.l0.state.status), 'ready')
  await frame.evaluate(() => {
    globalThis.l0.interactiveRun = undefined
    globalThis.l0.run('try:\n    input()\nexcept EOFError:\n    print("eof")').then((result) => {
      globalThis.l0.interactiveRun = result
    })
  })
  await frame.waitForFunction(() => globalThis.l0.state.inputId !== null, undefined, {
    timeout: 5000,
  })
  await frame.evaluate(() => globalThis.l0.submitLine(null))
  await frame.waitForFunction(() => globalThis.l0.interactiveRun !== undefined, undefined, {
    timeout: 5000,
  })
  const eof = await frame.evaluate(() => ({
    result: globalThis.l0.interactiveRun,
    output: [...globalThis.l0.state.events],
  }))
  evidence.eof = eof
  assert.ok(eof.result)
  assertRun({ result: eof.result, output: eof.output }, ['eof'])

  return { input, eof, stopMs }
}
