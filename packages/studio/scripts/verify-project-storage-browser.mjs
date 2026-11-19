import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, webkit } from '@playwright/test'

const url = process.argv[2]
if (!url) throw new Error('Expected fixture URL')
const selected = process.argv[3] ?? 'all'
const fixtureURL = (project) => {
  const next = new URL(url)
  next.searchParams.set('project', project)
  if (process.env.STUDIO_STORAGE_EXIT_FAULT === 'abort') next.searchParams.set('abort-exit', '1')
  return next.href
}
if (!['all', 'chromium', 'webkit'].includes(selected)) throw new Error('Unknown storage browser')
for (const [name, engine] of [
  ['chromium', chromium],
  ['webkit', webkit],
]) {
  if (selected !== 'all' && selected !== name) continue
  const started = performance.now()
  const phase = (label) =>
    process.stdout.write(
      `${JSON.stringify({ engine: name, phase: label, elapsedMs: Math.round(performance.now() - started) })}\n`,
    )
  phase('launching')
  // Windows WebKit can finish all assertions and close its contexts, then hang
  // in native graceful shutdown. Own the disposable test process explicitly.
  // Termination happens only after the recovery assertions; it is not a claim
  // that a learner's browser exits gracefully or that pending writes persisted.
  const ownedServer =
    process.platform === 'win32' && name === 'webkit'
      ? await engine.launchServer({ headless: true, host: '127.0.0.1' })
      : null
  const browser = ownedServer
    ? await engine.connect(ownedServer.wsEndpoint()).catch(async (error) => {
        await ownedServer.kill()
        throw error
      })
    : await engine.launch({
        headless: true,
        // Opcional, como no resto da suíte: um Chromium de outra revisão que a do pacote.
        ...(name === 'chromium' && process.env.PW_CHROMIUM
          ? { executablePath: process.env.PW_CHROMIUM }
          : {}),
      })
  phase('launched')
  const lifecycleSamples = []
  try {
    const context = await browser.newContext()
    context.on('page', (page) =>
      page.on('pageerror', (error) => process.stderr.write(`${name}: ${error.message}\n`)),
    )
    const cold = await context.newPage()
    const coldURL = new URL(fixtureURL(`cold-${name}`))
    coldURL.searchParams.set('cold-bind', '1')
    await cold.goto(coldURL.href, { waitUntil: 'commit' })
    await cold.waitForFunction(() => Boolean(window.coldStorageResult))
    assert.deepEqual(await cold.evaluate(() => window.coldStorageResult), {
      coldWriteRejected: true,
      nativePresent: true,
      nativeAcknowledged: true,
      synchronousAcknowledged: true,
      depth: 40_000,
    })
    phase('cold-bind-native-exit-verified')
    await cold.close()
    const page = await context.newPage()
    await page.goto(fixtureURL(`reload-${name}`))
    await page.waitForFunction(() => Boolean(window.storageHarness))
    if (process.env.STUDIO_STORAGE_DEEP === '1') {
      const deep = await page.evaluate(() => window.storageHarness.qualifyDeepStorage())
      assert.ok(deep.blocks >= 10_000)
      phase(`deep-storage-verified:${JSON.stringify(deep)}`)
    }
    const cdp = name === 'chromium' ? await context.newCDPSession(page) : null
    for (let round = 0; round < 12; round++) {
      if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })
      await page.evaluate((round) => {
        window.storageHarness.clearLifecycle()
        window.storageHarness.edit(`in-flight-${round}`)
        window.storageHarness.startSave()
        window.storageHarness.edit(`exit-${round}`)
      }, round)
      assert.equal((await page.evaluate(() => window.storageHarness.read())).dirty, true)
      await page.reload({ waitUntil: 'commit' })
      if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
      await page.waitForFunction(() => Boolean(window.storageHarness))
      const observed = await page.evaluate(() => ({
        state: window.storageHarness.read(),
        previousLifecycle: window.storageHarness.previousLifecycle,
        recoveredProjectIds: window.storageHarness.recoveredProjectIds,
        recoveredHead: window.storageHarness.recoveredHead,
      }))
      lifecycleSamples.push({ round, ...observed })
      await mkdir('.cache/mission', { recursive: true })
      await writeFile(
        `.cache/mission/storage-lifecycle-${name}-${process.env.STUDIO_STORAGE_EXIT_FAULT === 'abort' ? 'aborted' : 'normal'}.json`,
        JSON.stringify(
          { engine: name, browser: browser.version(), samples: lifecycleSamples },
          null,
          2,
        ),
      )
      assert.equal(
        observed.state.text.content,
        `exit-${round}`,
        JSON.stringify({ engine: name, round, ...observed }),
      )
      phase(`reload-${round}-verified`)
    }
    const first = await context.newPage(),
      second = await context.newPage()
    await first.goto(fixtureURL(`two-${name}`))
    await first.waitForFunction(() => Boolean(window.storageHarness))
    await second.goto(fixtureURL(`two-${name}`))
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
    phase('two-tabs-verified')
    const archive = await first.evaluate(() => window.storageHarness.qualifyDeepAncestorArchive())
    assert.equal(archive.exact, true)
    assert.equal(archive.acknowledged, true)
    assert.equal(archive.archived, 1)
    assert.equal(archive.meta.name, 'Small descendant')
    assert.equal(archive.journalAbsent, true)
    phase('deep-ancestor-archive-verified')
    // Chromium exposes the native beforeunload dialog in headless automation.
    // Exercise a real trusted click: synthetic evaluation alone has no sticky activation.
    if (name === 'chromium') {
      const denied = await context.newPage()
      const deniedURL = new URL(fixtureURL(`quota-${name}`))
      deniedURL.searchParams.set('deny-exit', '1')
      await denied.goto(deniedURL.href)
      await denied.waitForFunction(() => Boolean(window.storageHarness))
      await denied.evaluate(() => {
        const button = document.createElement('button')
        button.textContent = 'Editar projeto'
        button.onclick = () => window.storageHarness.edit('keep this unsaved revision')
        document.body.append(button)
      })
      await denied.getByRole('button', { name: 'Editar projeto' }).click()
      const dialogObserved = denied.waitForEvent('dialog', { timeout: 5000 })
      const leave = denied.evaluate(() => location.assign('/quota-destination'))
      const dialog = await dialogObserved
      assert.equal(dialog.type(), 'beforeunload')
      await dialog.dismiss()
      await leave
      assert.equal(denied.url(), deniedURL.href)
      const retained = await denied.evaluate(() => window.storageHarness.read())
      assert.equal(retained.text.content, 'keep this unsaved revision')
      assert.equal(retained.dirty, true)
      assert.equal(typeof retained.error, 'string')
      phase('quota-dialog-verified')
    }
    if (ownedServer) {
      // Keep its final context alive until process-tree termination. Closing the
      // last Windows WebKit context can exit the parent first, leaving its network
      // process alive with inherited pipes; a subsequent root-PID kill cannot own
      // that orphan. All persistence assertions have already completed above.
      phase('context-owned-by-test-process')
    } else {
      process.stdout.write(`closing context ${name}\n`)
      await context.close()
      phase('context-closed')
    }
  } finally {
    process.stdout.write(`closing browser ${name}\n`)
    if (ownedServer) {
      await ownedServer.kill()
      const ownedProcess = ownedServer.process()
      assert.ok(ownedProcess.exitCode !== null || ownedProcess.signalCode !== null)
      phase('owned-test-process-terminated')
    } else {
      await browser.close()
      phase('browser-closed')
    }
  }
  process.stdout.write(
    `pass ${name}: 12 immediate reloads + two independent tabs; browser closed\n`,
  )
}
