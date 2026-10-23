import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

// Native Node owns Playwright; Bun only serves the immutable test resources.
const config = JSON.parse(await readFile(process.argv[2], 'utf8'))
const { evidence, snapshot, runtime } = config
const app = { url: new URL(config.appOrigin) }
const service = { url: new URL(config.serviceOrigin) }
const unknown = { url: new URL(config.unknownOrigin) }
const release = { manifestSha256: runtime }
const results = []
for (const channel of ['chrome', 'msedge']) {
  console.info('preview-browser channel', channel)
  const browser = await chromium.launch({ channel, headless: true, timeout: 15_000 })
  const errors = [],
    consoleMessages = [],
    unexpectedRequests = [],
    routedRequests = []
  try {
    const context = await browser.newContext({ acceptDownloads: true })
    context.setDefaultTimeout(15_000)
    context.setDefaultNavigationTimeout(20_000)
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      consoleMessages.push(message.text())
      if (message.type() === 'error')
        console.info('preview-browser console', channel, message.text())
    })
    await context.route('**/*', async (route) => {
      routedRequests.push(route.request().url())
      if (
        [app.url.origin, service.url.origin, unknown.url.origin].includes(
          new URL(route.request().url()).origin,
        )
      )
        await route.continue()
      else {
        unexpectedRequests.push(route.request().url())
        await route.abort()
      }
    })
    console.info('preview-browser navigate', channel)
    await page.goto(app.url.href)
    console.info('preview-browser awaiting Python input', channel)
    const player = page.frameLocator('#preview')
    await player.locator('#input-form:not([hidden])').waitFor({ timeout: 60_000 })
    console.info('preview-browser input ready', channel)
    await page.waitForFunction(() =>
      window.previewMessages.some((message) => message.status === 'ready'),
    )
    const bridge = await page.evaluate(() => ({
      messages: window.previewMessages,
      session: new URLSearchParams(
        new URL(document.querySelector('#preview').src).hash.slice(1),
      ).get('studio-preview-session'),
    }))
    assert.ok(bridge.messages.some((message) => message.status === 'loading'))
    assert.ok(bridge.messages.some((message) => message.status === 'ready'))
    for (const message of bridge.messages) {
      assert.equal(message.type, 'studio-python-preview')
      assert.equal(message.version, 1)
      assert.equal(message.session, bridge.session)
      assert.equal(message.previewId, new URL(config.previewURL).pathname.split('/')[3])
    }
    await player
      .frameLocator('#stage iframe')
      .locator('body')
      .evaluate(
        (_body, forged) => {
          window.parent.parent.postMessage(forged.message, forged.origin)
        },
        { message: { ...bridge.messages.at(-1), status: 'unavailable' }, origin: app.url.origin },
      )
    await page.waitForFunction(() => window.ignoredPreviewMessages > 0)
    assert.equal(
      await page.evaluate(() =>
        window.previewMessages.some((message) => message.status === 'unavailable'),
      ),
      false,
    )
    await player.locator('#input').fill('Bia')
    await player.locator('#input-form button').click()
    await player.locator('#output').filter({ hasText: 'ola Bia' }).waitFor()
    const canvas = player.frameLocator('#stage iframe').locator('canvas')
    await canvas.click({ position: { x: 50, y: 50 } })
    await canvas.press('Space')
    await player.locator('#output').filter({ hasText: 'key-fired' }).waitFor()
    await player.locator('#output').filter({ hasText: 'click-fired' }).waitFor()
    assert.equal(
      await player.locator('#stage iframe').getAttribute('sandbox'),
      'allow-scripts allow-pointer-lock',
    )
    const downloadEvent = page.waitForEvent('download')
    await player.locator('#capture').click()
    const download = await downloadEvent
    await download.saveAs(path.join(evidence, `${channel}-interactive.png`))
    await player.locator('#stop').click()
    assert.equal(await player.locator('#stage iframe').count(), 0)
    await player.locator('#start').click()
    await player.locator('#input-form:not([hidden])').waitFor({ timeout: 60_000 })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(
      await player.locator('body').evaluate((body) => body.scrollWidth <= innerWidth),
      true,
    )
    await page.screenshot({ path: path.join(evidence, `${channel}-responsive.png`) })
    assert.deepEqual(errors, [])
    assert.deepEqual(unexpectedRequests, [])
    const headStatus = await page.evaluate(
      async (url) =>
        (await fetch(url, { method: 'HEAD', credentials: 'omit', redirect: 'error' })).status,
      config.previewURL,
    )
    assert.equal(
      headStatus,
      200,
      'Only the approved application may probe preview availability through CORS',
    )
    const otherPayload = new URL('payload.json', config.otherPreviewURL).href
    const direct = await context.request.get(otherPayload)
    assert.equal(direct.status(), 200, 'The second immutable preview must really exist')
    const beforeOther = routedRequests.filter((url) => url === otherPayload).length
    const crossPrefix = await player.locator('body').evaluate(async (_body, url) => {
      try {
        await fetch(url)
        return 'allowed'
      } catch {
        return 'blocked'
      }
    }, otherPayload)
    assert.equal(crossPrefix, 'blocked')
    assert.equal(routedRequests.filter((url) => url === otherPayload).length, beforeOther)
    const authoredScript = await player.locator('body').evaluate(
      (body, url) =>
        new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = url
          script.onload = () => resolve('executed')
          script.onerror = () => resolve('blocked')
          body.append(script)
        }),
      new URL('project/injected.js', config.previewURL).href,
    )
    assert.equal(authoredScript, 'blocked')
    for (const file of ['injected.html', 'injected.js', 'injected.svg']) {
      const authored = await context.newPage()
      try {
        const downloaded = authored.waitForEvent('download')
        await authored.goto(new URL(`project/${file}`, config.previewURL).href).catch((error) => {
          assert.match(error.message, /ERR_ABORTED|Download is starting/)
        })
        await (await downloaded).saveAs(path.join(evidence, `${channel}-${file}.download`))
        assert.equal(await authored.evaluate(() => typeof globalThis.attacked), 'undefined')
      } finally {
        await authored.close()
      }
    }
    // Unknown parents and opaque outer frames must not execute the player.
    await page.goto(unknown.url.href)
    await page.waitForFunction(() => performance.getEntriesByType('resource').length > 0)
    assert.equal(await page.frameLocator('iframe').locator('#input-form:not([hidden])').count(), 0)
    await page.goto(new URL('nested', unknown.url).href)
    await page.waitForFunction(() => performance.getEntriesByType('resource').length > 0)
    assert.equal(
      await page
        .frameLocator('iframe')
        .frameLocator('#preview')
        .locator('#input-form:not([hidden])')
        .count(),
      0,
    )
    await page.goto(new URL('opaque', app.url).href)
    await page.waitForFunction(() => performance.getEntriesByType('resource').length > 0)
    assert.equal(
      await page.frameLocator('#preview').locator('#input-form:not([hidden])').count(),
      0,
    )
    assert.deepEqual(unexpectedRequests, [])
    results.push({
      channel,
      passed: true,
      directAuthoredDownloads: 3,
      crossPrefixBlocked: true,
      authoredScriptBlocked: true,
      ancestorChainBlocked: true,
      approvedCorsHead: true,
      bridgeAcknowledgements: bridge.messages,
      ignoredLearnerForgedAcknowledgement: true,
      consoleMessages,
      errors,
      unexpectedRequests,
    })
    await context.close()
  } finally {
    await writeFile(
      path.join(evidence, `${channel}-observations.json`),
      JSON.stringify({ errors, consoleMessages, unexpectedRequests }, null, 2),
    )
    await browser.close()
  }
}
await writeFile(
  path.join(evidence, 'browser-results.json'),
  JSON.stringify({ verified: true, snapshot, runtime: release.manifestSha256, results }, null, 2),
)
console.info(
  JSON.stringify({ verified: true, evidence, browsers: results.map((result) => result.channel) }),
)
