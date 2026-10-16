import assert from 'node:assert/strict'
import { chromium, webkit } from '@playwright/test'

const url = process.argv[2]
if (!url) throw new Error('Expected fixture URL')
for (const [name, engine] of [
  ['chromium', chromium],
  ['webkit', webkit],
]) {
  const browser = await engine.launch({ headless: true })
  try {
    const context = await browser.newContext()
    context.on('page', (page) =>
      page.on('pageerror', (error) => process.stderr.write(`${name}: ${error.message}\n`)),
    )
    const page = await context.newPage()
    await page.goto(`${url}?project=reload-${name}`)
    await page.waitForFunction(() => Boolean(window.storageHarness))
    const cdp = name === 'chromium' ? await context.newCDPSession(page) : null
    for (let round = 0; round < 12; round++) {
      if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })
      await page.evaluate((round) => {
        window.storageHarness.edit(`in-flight-${round}`)
        window.storageHarness.startSave()
        window.storageHarness.edit(`exit-${round}`)
      }, round)
      assert.equal((await page.evaluate(() => window.storageHarness.read())).dirty, true)
      await page.reload({ waitUntil: 'commit' })
      if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
      await page.waitForFunction(() => Boolean(window.storageHarness))
      assert.equal(
        (await page.evaluate(() => window.storageHarness.read())).text.content,
        `exit-${round}`,
      )
    }
    const first = await context.newPage(),
      second = await context.newPage()
    await first.goto(`${url}?project=two-${name}`)
    await first.waitForFunction(() => Boolean(window.storageHarness))
    await second.goto(`${url}?project=two-${name}`)
    await second.waitForFunction(() => Boolean(window.storageHarness))
    await first.evaluate(() => window.storageHarness.edit('first-wins'))
    assert.equal(await first.evaluate(() => window.storageHarness.save()), 'saved')
    await second.evaluate(() => window.storageHarness.edit('stale-second'))
    assert.equal(await second.evaluate(() => window.storageHarness.save()), 'ProjectWriteConflict')
    await second.reload()
    await second.waitForFunction(() => Boolean(window.storageHarness))
    assert.equal(
      (await second.evaluate(() => window.storageHarness.read())).text.content,
      'first-wins',
    )
    process.stdout.write(`closing context ${name}\n`)
    await context.close()
  } finally {
    process.stdout.write(`closing browser ${name}\n`)
    await browser.close()
  }
  process.stdout.write(
    `pass ${name}: 12 immediate reloads + two independent tabs; browser closed\n`,
  )
}
