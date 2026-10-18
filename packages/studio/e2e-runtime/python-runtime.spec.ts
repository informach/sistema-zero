import { expect, type Frame, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/frame'
import type { PythonWorkerEvent } from '../src/runtime/python/protocol'

test.beforeEach(async ({ request }, testInfo) => {
  const response = await request.get('/distribution')
  expect(response.ok()).toBeTruthy()
  await testInfo.attach('runtime-distribution', {
    body: await response.body(),
    contentType: 'application/json',
  })
})

async function ready(page: Page, fixture: string) {
  await page.goto('/')
  const element = await page.locator('iframe').elementHandle()
  const frame = await element?.contentFrame()
  if (!frame) throw new Error('A área de prova do worker não foi montada.')
  await frame.waitForURL((url) => url.pathname === '/frame')
  await frame.waitForFunction(() =>
    globalThis.pythonProbe?.events.some(
      (event) => event.type === 'booted' || event.type === 'failed',
    ),
  )
  expect(
    await frame.evaluate(() =>
      globalThis.pythonProbe.events.filter((event) => event.type === 'failed'),
    ),
  ).toEqual([])
  await frame.evaluate((name) => globalThis.pythonProbe.prepare(name), fixture)
  await frame.waitForFunction(() =>
    globalThis.pythonProbe.events.some(
      (event) => event.type === 'prepared' || event.type === 'failed',
    ),
  )
  expect(
    await frame.evaluate(() =>
      globalThis.pythonProbe.events.filter((event) => event.type === 'failed'),
    ),
  ).toEqual([])
  await frame.evaluate(() => {
    globalThis.pythonProbe.events.length = 0
  })
  return frame
}
async function result(frame: Frame, requestId: string) {
  await frame.waitForFunction(
    (id) =>
      globalThis.pythonProbe.events.some(
        (event) => event.type === 'failed' || (event.type === 'result' && event.requestId === id),
      ),
    requestId,
  )
  const events = await frame.evaluate(() => [...globalThis.pythonProbe.events])
  expect(events.filter((event) => event.type === 'failed')).toEqual([])
  return events.find(
    (event): event is Extract<PythonWorkerEvent, { type: 'result' }> =>
      event.type === 'result' && event.requestId === requestId,
  )!
}
async function run(frame: Frame) {
  await frame.evaluate(() => globalThis.pythonProbe.command({ type: 'run', requestId: 'run' }))
  return result(frame, 'run')
}
async function evaluate(frame: Frame, source: string, requestId = 'eval') {
  await frame.evaluate(
    ({ source, requestId }) =>
      globalThis.pythonProbe.command({ type: 'evaluate', requestId, source }),
    { source, requestId },
  )
  return result(frame, requestId)
}
async function output(frame: Frame) {
  return frame.evaluate(() =>
    globalThis.pythonProbe.events.flatMap((event) =>
      event.type === 'console' ? event.batches : [],
    ),
  )
}

test('unchanged source, imports, binary files and REPL share the script namespace', async ({
  page,
}) => {
  const frame = await ready(page, 'portable')
  expect(await run(frame)).toMatchObject({ ok: true })
  expect((await output(frame)).map((batch) => batch.text).join('')).toBe('ação 🐢 42\n')
  expect(await evaluate(frame, 'value = 9\ncurrent()')).toMatchObject({ ok: true, text: '9' })
  expect(await evaluate(frame, '1 / 0', 'error')).toMatchObject({
    ok: false,
    text: 'division by zero',
  })
  expect(await evaluate(frame, 'current()', 'again')).toMatchObject({ ok: true, text: '9' })
  expect(await evaluate(frame, "print('REPL', end='')", 'partial')).toMatchObject({ ok: true })
  expect((await output(frame)).map((batch) => batch.text).join('')).toBe('ação 🐢 42\nREPL')
  expect(await evaluate(frame, "'🐢' * 10000", 'unicode')).toMatchObject({ ok: true })
})
test('standard library source inspection, tracebacks, classes, exact fractions and seeded RNG remain available', async ({
  page,
}, testInfo) => {
  const frame = await ready(page, 'stdlibInspection')
  const execution = await run(frame)
  await testInfo.attach('stdlib-golden', {
    contentType: 'application/json',
    body: JSON.stringify({ execution, output: await output(frame) }),
  })
  expect(execution).toMatchObject({ ok: true })
  // Captured from the unchanged pinned upstream ZIP in Chrome and Edge.
  expect((await output(frame)).map((batch) => batch.text).join('')).toBe(
    'stdlib preserved c66c59735e9f502ab02d7bed190e04b8e9842b8d117afd8750209c511d4cc632 853c73dd0f702114c7b495354569e5d2a8fdec2706ac627aeff627c6568ae74c\n',
  )
})

test('input suspends, accepts an empty line, and EOF stays distinct', async ({ page }) => {
  const frame = await ready(page, 'input')
  await frame.evaluate(() => globalThis.pythonProbe.command({ type: 'run', requestId: 'run' }))
  for (const [index, response] of [
    { kind: 'line', text: 'Ana 🐢' },
    { kind: 'line', text: '' },
    { kind: 'eof' },
  ].entries()) {
    const requestId = `input-${index + 1}`
    await frame.waitForFunction(
      (id) =>
        globalThis.pythonProbe.events.some(
          (event) => event.type === 'input-request' && event.requestId === id,
        ),
      requestId,
    )
    await frame.evaluate(
      ({ requestId, response }) =>
        globalThis.pythonProbe.command({
          type: 'input',
          requestId,
          response: response as { kind: 'line'; text: string } | { kind: 'eof' },
        }),
      { requestId, response },
    )
  }
  expect(await result(frame, 'run')).toMatchObject({ ok: true })
  expect((await output(frame)).map((batch) => batch.text).join('')).toBe(
    "Nome: primeiro: 'Ana 🐢'\nvazio: ''\nEOF\n",
  )
})
test('partial byte writes preserve text and stderr without inventing newlines', async ({
  page,
}) => {
  const frame = await ready(page, 'partial')
  expect(await run(frame)).toMatchObject({ ok: true })
  const batches = await output(frame)
  expect(
    batches
      .filter((batch) => batch.stream === 'stdout')
      .map((batch) => batch.text)
      .join(''),
  ).toBe('a🐢b')
  expect(
    batches
      .filter((batch) => batch.stream === 'stderr')
      .map((batch) => batch.text)
      .join(''),
  ).toBe('erro')
})
test('a two MiB line stays bounded before any timer can flush', async ({ page }) => {
  const frame = await ready(page, 'flood')
  expect(await run(frame)).toMatchObject({ ok: true })
  const batches = await output(frame)
  expect(batches.reduce((sum, batch) => sum + batch.text.length, 0)).toBeLessThanOrEqual(64_000)
  expect(batches.reduce((sum, batch) => sum + batch.text.length + batch.omittedChars, 0)).toBe(
    2 * 1024 * 1024,
  )
  expect(batches.reduce((sum, batch) => sum + batch.omittedLines, 0)).toBe(0)
})
for (const [fixture, text, ok] of [
  ['noNewline', 'fim 🐢', true],
  ['noNewlineError', 'antes', false],
  ['customStream', 'custom', true],
] as const)
  test(`flushes Python text streams before ${fixture} result`, async ({ page }) => {
    const frame = await ready(page, fixture)
    expect(await run(frame)).toMatchObject({ ok })
    expect((await output(frame)).map((batch) => batch.text).join('')).toBe(text)
  })
test('a failure to flush is a structured program error', async ({ page }) => {
  const frame = await ready(page, 'flushError')
  expect(await run(frame)).toMatchObject({ ok: false, text: 'Falha ao descarregar' })
})
for (const fixture of ['syntax', 'error', 'unicodeError'])
  test(`structured ${fixture} with source traceback`, async ({ page }) => {
    const frame = await ready(page, fixture)
    expect(await run(frame)).toMatchObject({
      ok: false,
      traceback: expect.stringContaining('src/main.py'),
    })
  })
test('SystemExit zero completes without a program error', async ({ page }) => {
  const frame = await ready(page, 'exit')
  expect(await run(frame)).toMatchObject({ ok: true, text: '' })
})
test('SystemExit float zero retains CPython nonzero-exit semantics', async ({ page }) => {
  const frame = await ready(page, 'exitFloat')
  expect(await run(frame)).toMatchObject({ ok: false, text: '0.0' })
})
test('concurrent execution is rejected while input is suspended', async ({ page }) => {
  const frame = await ready(page, 'waiting')
  await frame.evaluate(() => globalThis.pythonProbe.command({ type: 'run', requestId: 'run' }))
  await frame.waitForFunction(() =>
    globalThis.pythonProbe.events.some((event) => event.type === 'input-request'),
  )
  await frame.evaluate(() => globalThis.pythonProbe.command({ type: 'run', requestId: 'second' }))
  await frame.waitForFunction(() =>
    globalThis.pythonProbe.events.some((event) => event.type === 'failed'),
  )
  expect(
    await frame.evaluate(() =>
      globalThis.pythonProbe.events.filter((event) => event.type === 'result'),
    ),
  ).toEqual([])
})
