import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

const config = JSON.parse(await readFile(process.argv[2], 'utf8'))
const results = []
for (const channel of ['chrome', 'msedge']) {
  console.info('activity-browser channel', channel)
  const browser = await chromium.launch({ channel, headless: true, timeout: 15_000 })
  const diagnostics = [],
    pageErrors = [],
    unexpectedRequests = []
  try {
    const context = await browser.newContext()
    context.setDefaultTimeout(20_000)
    const page = await context.newPage()
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) =>
      diagnostics.push({ type: message.type(), text: message.text().slice(0, 4000) }),
    )
    await context.route('**/*', async (route) => {
      if ([config.appOrigin, config.serviceOrigin].includes(new URL(route.request().url()).origin))
        await route.continue()
      else {
        unexpectedRequests.push(route.request().url())
        await route.abort()
      }
    })
    await page.goto(config.appOrigin)
    await page.waitForFunction(() => !!window.studioPythonActivityProof)
    const wake = await page.evaluate(() => window.studioPythonActivityProof.rendererWake())
    assert.deepEqual(wake.before.events, [])
    assert.deepEqual(wake.during.events, [])
    const cases = []
    for (const [name, stopPending] of [
      ['console', false],
      ['turtle', false],
      ['busy', false],
      ['busy', true],
    ]) {
      console.info('activity-browser scenario', channel, name, stopPending)
      // Playwright's object serializer intentionally drops __proto__ keys.
      // Transfer literal Python dictionaries as JSON text, preserving accepted data.
      const result = JSON.parse(
        await page.evaluate(
          async ([name, stopPending]) =>
            JSON.stringify(await window.studioPythonActivityProof.runCase(name, stopPending)),
          [name, stopPending],
        ),
      )
      cases.push(result)
      await writeFile(
        path.join(config.evidence, `${channel}-${name}-${stopPending}.json`),
        JSON.stringify(result),
      )
      assert.equal(result.framesRemaining, 0)
      assert.equal(
        createHash('sha256').update(result.source).digest('hex'),
        result.snapshot.files[0].sha256,
      )
      if (name === 'busy') {
        assert.equal(result.feedback, undefined)
        assert.ok(result.caught, 'Busy/withdrawn generation must not approve')
        if (!stopPending) assert.match(result.caught, /prazo|respondeu/i)
      } else {
        assert.equal(result.caught, undefined)
        assert.deepEqual(result.failures, [])
        assert.equal(result.stderr, '')
        const expected =
          name === 'console'
            ? {
                stdout: true,
                dict: true,
                echo: true,
                typed: false,
                tuple: true,
                async: true,
                code: true,
                error: false,
                kelvin: true,
                triple: true,
                continued: true,
              }
            : { move: true, position: true, heading: true, pen: true, visible: true, code: true }
        assert.deepEqual(
          Object.fromEntries(result.feedback.results.map((item) => [item.checkId, item.passed])),
          expected,
        )
        assert.ok(result.feedback.results.every((item) => item.verifiedBy === 'client'))
        if (name === 'console') {
          const dict = result.activity.checks.find((item) => item.id === 'dict').rule.value
          const echo = result.activity.checks.find((item) => item.id === 'echo').cases[0]
          for (const literal of [dict, echo.args[0], echo.expected])
            assert.equal(Object.hasOwn(literal, '__proto__'), true)
          const message = result.feedback.results.find((item) => item.checkId === 'error').message
          assert.ok(message.length <= 2000)
          assert.ok(result.stdout.includes('activity-ready'))
        } else {
          assert.ok(result.capture?.frameSequence > 0)
          assert.equal(result.capture.width, 320)
          assert.equal(result.capture.height, 240)
          await writeFile(
            path.join(config.evidence, `${channel}-turtle.png`),
            Buffer.from(result.capture.dataUrl.split(',')[1], 'base64'),
          )
        }
      }
    }
    const consumers = []
    for (const name of ['console', 'turtle', 'update', 'structural', 'invalid', 'cancel']) {
      console.info('activity-browser consumer', channel, name)
      const result = JSON.parse(
        await page.evaluate(
          async (name) =>
            JSON.stringify(await window.studioPythonActivityProof.runConsumerCase(name)),
          name,
        ),
      )
      consumers.push(result)
      await writeFile(
        path.join(config.evidence, `${channel}-consumer-${name}.json`),
        JSON.stringify(result),
      )
      assert.equal(result.framesRemaining, 0)
      assert.equal(result.project.tree['main.py'].content, result.source)
      if (name === 'cancel') {
        assert.equal(result.grade, undefined)
        assert.match(result.caught, /retirada|cancelada|encerrada/i)
      } else {
        assert.equal(result.caught, undefined)
        assert.ok(result.grade.results.every((item) => item.verifiedBy === 'client'))
        assert.ok(
          result.grade.results.every((item) => item.passed === (name !== 'invalid')),
          JSON.stringify(result.grade),
        )
        assert.equal(result.executionFrames, name === 'invalid' ? 0 : 1)
        if (name === 'console') {
          const test = result.activity.checks.find((item) => item.id === 'echo').cases[0]
          assert.equal(Object.hasOwn(test.args[0], '__proto__'), true)
          assert.equal(Object.hasOwn(test.expected, '__proto__'), true)
        }
      }
    }
    assert.deepEqual(pageErrors, [])
    assert.deepEqual(unexpectedRequests, [])
    results.push({ channel, wake, cases, consumers, diagnostics, pageErrors, unexpectedRequests })
  } finally {
    await writeFile(
      path.join(config.evidence, `${channel}-diagnostics.json`),
      JSON.stringify({ diagnostics, pageErrors, unexpectedRequests }),
    )
    await browser.close()
  }
}
await writeFile(path.join(config.evidence, 'browser-results.json'), JSON.stringify(results))
console.info(
  JSON.stringify({
    verified: true,
    channels: results.map((item) => item.channel),
    scenarios: 20,
    evidence: config.evidence,
  }),
)
