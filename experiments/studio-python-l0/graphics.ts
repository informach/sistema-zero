import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Frame } from '@playwright/test'
import { assertRun, deadline, type RunEvidence } from './checks.ts'

export async function qualifyGraphics(frame: Frame, evidence: Record<string, unknown>) {
  for (const [name, expected, lines] of [
    ['geometry', '{"closed": true, "heading": 0.0}', 4],
    ['events', '["before-update", "timer", "after-update"]', 1],
    ['timers', '[1, 2, 3]', 0],
    ['timer-motion', '["before", "timer", "after"]', 1],
    ['callback-reentrant', '["before", "first", "second", "first-after-update", "after"]', 1],
    ['callback-error', '["before", "broken", "survived", "after"]', 0],
    ['sleep', '["before-sleep", "after-sleep", "timer", "after-update"]', 0],
  ] as const) {
    const code = await readFile(resolve(import.meta.dirname, `fixtures/${name}.py`), 'utf8')
    await frame.evaluate(() => globalThis.l0.resetGraphics())
    const result: RunEvidence = await deadline(
      frame.evaluate(
        async (source) => ({
          result: await globalThis.l0.run(source, { turtle: true }),
          output: [...globalThis.l0.state.events],
        }),
        code,
      ),
      5000,
      `Turtle ${name}`,
    )
    evidence[name] = result
    assertRun(
      result,
      [expected],
      0,
      name === 'callback-error' ? /ValueError: callback-canary/ : undefined,
    )
    const graphics = await frame.evaluate(() => globalThis.l0.graphics())
    evidence[`${name}Graphics`] = graphics
    assert.equal(graphics?.lines, lines)
    assert.ok((graphics?.batches ?? 0) >= 1)
  }

  await frame.evaluate(() => {
    globalThis.l0.interactiveRun = undefined
    globalThis.l0
      .run(
        'import turtle\nscreen = turtle.Screen()\npen = turtle.Turtle()\nhit = False\ndef pressed():\n    global hit\n    hit = True\nscreen.listen()\nscreen.onkeypress(pressed, "Right")\nfor i in range(500):\n    pen.forward(1)\n    if i == 0: print("moving", flush=True)\n    if hit: break\nassert hit and 0 < pen.position()[0] < 500\nprint("key-during-movement")\nscreen.bye()',
        { turtle: true },
      )
      .then((result) => {
        globalThis.l0.interactiveRun = result
      })
  })
  await frame.waitForFunction(
    () => globalThis.l0.state.events.some((event) => event.text === 'moving'),
    undefined,
    { timeout: 5000 },
  )
  await frame.locator('canvas').press('ArrowRight')
  await frame.waitForFunction(() => globalThis.l0.interactiveRun !== undefined, undefined, {
    timeout: 5000,
  })
  const movement = await frame.evaluate(() => ({
    result: globalThis.l0.interactiveRun,
    output: [...globalThis.l0.state.events],
  }))
  evidence.keyboardDuringMovement = movement
  assert.ok(movement.result)
  assertRun({ result: movement.result, output: movement.output }, ['moving', 'key-during-movement'])

  await frame.evaluate(() => {
    globalThis.l0.interactiveRun = undefined
    globalThis.l0
      .run(
        'import turtle\nscreen = turtle.Screen()\npen = turtle.Turtle()\ndef pressed():\n    print("key-during-mainloop")\n    screen.bye()\nscreen.listen()\nscreen.onkeypress(pressed, "Right")\nprint("listening", flush=True)\nscreen.mainloop()\nprint("mainloop-ended")',
        { turtle: true },
      )
      .then((result) => {
        globalThis.l0.interactiveRun = result
      })
  })
  await frame.waitForFunction(
    () => globalThis.l0.state.events.some((event) => event.text === 'listening'),
    undefined,
    { timeout: 5000 },
  )
  await frame.locator('canvas').press('ArrowRight')
  await frame.waitForFunction(() => globalThis.l0.interactiveRun !== undefined, undefined, {
    timeout: 5000,
  })
  const keyboard = await frame.evaluate(() => ({
    result: globalThis.l0.interactiveRun,
    output: [...globalThis.l0.state.events],
  }))
  evidence.keyboard = keyboard
  assert.ok(keyboard.result)
  assertRun({ result: keyboard.result, output: keyboard.output }, [
    'listening',
    'key-during-mainloop',
    'mainloop-ended',
  ])
  // Events on a stopped canvas must not be replayed by a new interpreter.
  await frame.evaluate(() => globalThis.l0.stop())
  await frame.locator('canvas').press('ArrowRight')
  await frame.evaluate(() => globalThis.l0.start())
  await frame.waitForFunction(
    () => ['ready', 'failed'].includes(globalThis.l0.state.status),
    undefined,
    { timeout: 30000 },
  )
  assert.equal(await frame.evaluate(() => globalThis.l0.state.status), 'ready')
  const staleInput = await deadline(
    frame.evaluate(async () => ({
      result: await globalThis.l0.run(
        'import turtle\nscreen = turtle.Screen()\nscreen.listen()\nscreen.onkeypress(lambda: print("stale-key-after-stop"), "Right")\nscreen.update()\nscreen.bye()\nprint("clean-generation")',
        { turtle: true },
      ),
      output: [...globalThis.l0.state.events],
    })),
    5000,
    'Input generation isolation',
  )
  evidence.staleInput = staleInput
  assertRun(staleInput, ['clean-generation'])
  return evidence
}
