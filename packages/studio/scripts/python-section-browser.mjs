import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

const config = JSON.parse(await readFile(process.argv[2], 'utf8'))
const browsers = []
for (const channel of ['chrome', 'msedge']) {
  const browser = await chromium.launch({ channel, headless: true, timeout: 15000 })
  const errors = [],
    diagnostics = [],
    unexpected = [],
    cases = []
  try {
    const context = await browser.newContext()
    context.setDefaultTimeout(70000)
    await context.route('**/*', async (route) => {
      if ([config.appOrigin, config.serviceOrigin].includes(new URL(route.request().url()).origin))
        await route.continue()
      else {
        unexpected.push(route.request().url())
        await route.abort()
      }
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) =>
      diagnostics.push({ type: message.type(), text: message.text().slice(0, 4000) }),
    )
    await page.goto(config.appOrigin)
    await page.waitForFunction(() => !!window.studioPythonSectionProof)
    for (const kind of ['classic', 'pro'])
      for (const name of ['valid', 'wrong-file', 'invalid', 'profile', 'captured', 'cancel']) {
        console.info('section-browser', channel, kind, name)
        const result = JSON.parse(
          await page.evaluate(
            async ([kind, name]) =>
              JSON.stringify(await window.studioPythonSectionProof.run(kind, name)),
            [kind, name],
          ),
        )
        cases.push(result)
        await writeFile(
          path.join(config.evidence, `${channel}-${kind}-${name}.json`),
          JSON.stringify(result),
        )
        assert.equal(result.framesRemaining, 0)
        assert.equal(
          result.snapshot.files.find((file) => file.path === 'main.py').sha256,
          createHash('sha256').update(result.source).digest('hex'),
        )
        if (name === 'profile' || name === 'cancel') {
          assert.equal(result.results, undefined)
          assert.ok(result.caught)
          if (name === 'profile') {
            assert.match(result.caught.message, /ambiente Python/i)
            assert.equal(result.frames.length, 0)
          } else {
            assert.equal(result.caught.name, 'AbortError')
            assert.ok(result.frames.length > 0)
          }
        } else {
          assert.equal(result.caught, undefined)
          assert.deepEqual(
            result.results.map((item) => item.passed),
            [0, 1, 2, 3, 4].map(
              (index) => name !== 'invalid' && !(name === 'wrong-file' && index === 4),
            ),
          )
          assert.ok(result.results.every((item) => item.verifiedBy === 'client'))
          const analysisFrames = result.frames.filter((url) => url !== 'about:blank')
          assert.ok(analysisFrames.length > 0)
          assert.ok(
            analysisFrames.every((url) => new URL(url).pathname.endsWith('/analysis.html')),
            'Structural checks must not execute the game',
          )
          if (name === 'invalid') assert.ok(result.results.every((item) => item.message.length > 0))
        }
      }
    assert.deepEqual(errors, [])
    assert.deepEqual(unexpected, [])
    browsers.push({ channel, cases, errors, diagnostics, unexpected })
  } finally {
    await writeFile(
      path.join(config.evidence, `${channel}-diagnostics.json`),
      JSON.stringify({ errors, diagnostics, unexpected }),
    )
    await browser.close()
  }
}
await writeFile(path.join(config.evidence, 'browser-results.json'), JSON.stringify(browsers))
console.info(JSON.stringify({ verified: true, scenarios: 24, evidence: config.evidence }))
