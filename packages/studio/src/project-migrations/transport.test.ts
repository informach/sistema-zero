import { expect, test } from 'bun:test'
import { REMOTE_EVALUATE_SOURCE } from '../../scripts/project-migrations/transport'

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor

test('remote transport preserves UTF-8 when every input byte arrives separately', async () => {
  const value = { objective: 'Seleção, ação e números: criança 🚀', nested: ['漢字', 'e\u0301'] }
  const bytes = new TextEncoder().encode(`process.capture(${JSON.stringify(value)});`)
  let captured: unknown
  const process = {
    stdin: (async function* () {
      for (const byte of bytes) yield Buffer.from([byte])
    })(),
    capture: (result: unknown) => {
      captured = result
    },
  }
  await new AsyncFunction('process', REMOTE_EVALUATE_SOURCE)(process)
  expect(captured).toEqual(value)
})

test('invalid UTF-8 stops remote evaluation before any operation', async () => {
  let executed = false
  const process = {
    stdin: (async function* () {
      yield Buffer.concat([
        Buffer.from('process.capture("'),
        Buffer.from([0xc3]),
        Buffer.from('");'),
      ])
    })(),
    capture: () => {
      executed = true
    },
  }
  let failed = false
  try {
    await new AsyncFunction('process', REMOTE_EVALUATE_SOURCE)(process)
  } catch {
    failed = true
  }
  expect(failed).toBe(true)
  expect(executed).toBe(false)
})
