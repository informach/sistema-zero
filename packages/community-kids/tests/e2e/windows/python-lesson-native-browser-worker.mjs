import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

// No provider reader/import/Chrome before the native owner's exclusive claim.
export async function runNativeBrowser(jobPath, nonce) {
  const job = JSON.parse(readFileSync(jobPath, 'utf8'))
  assert.equal(job.nonce, nonce)
  assert.equal(job.version, 1)
  const directory = job.directory
  const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
  const put = (name, value) => {
    const path = join(directory, name),
      temporary = `${path}.pending`
    writeFileSync(temporary, JSON.stringify({ ...value, version: 1, pid: process.pid, nonce }), {
      flag: 'wx',
    })
    renameSync(temporary, path)
  }
  const stop = () =>
    existsSync(join(directory, 'stop.request')) || Date.now() >= Date.parse(job.softEndUtc)
  const controller = new AbortController()
  let browser,
    closePromise,
    closed = false,
    timer,
    provider,
    result,
    primary = null,
    phase = 'preclaim'
  const close = () => {
    if (browser && !closePromise)
      closePromise = browser.close().then(() => {
        closed = true
      })
    return closePromise
  }
  const requestStop = () => {
    controller.abort()
    void close()?.catch(() => {})
  }
  try {
    const claimEnd = Date.now() + 10000
    while (!existsSync(join(directory, 'claim.json'))) {
      if (stop() || Date.now() >= claimEnd) throw new Error()
      await delay(20)
    }
    const claim = JSON.parse(readFileSync(join(directory, 'claim.json'), 'utf8'))
    assert.equal(claim.pid, process.pid)
    assert.equal(claim.nonce, nonce)
    assert(!stop())
    for (const pin of job.pins) assert.equal(sha(pin.path), pin.sha256)
    timer = setInterval(() => {
      if (stop()) requestStop()
    }, 50)
    phase = 'provider'
    const { receiveRailwayProvider } = await import(pathToFileURL(job.providerEntry).href)
    provider = await receiveRailwayProvider(process.stdin, { attemptId: job.attemptId })
    controller.signal.throwIfAborted()
    while (!existsSync(join(directory, 'launch.json'))) {
      if (stop()) throw new Error()
      await delay(20)
    }
    const launch = JSON.parse(readFileSync(join(directory, 'launch.json'), 'utf8'))
    assert.equal(launch.pid, process.pid)
    assert.equal(launch.nonce, nonce)
    controller.signal.throwIfAborted()
    phase = 'launch'
    const { chromium } = await import(pathToFileURL(job.playwrightEntry).href)
    browser = await chromium.launch({
      channel: 'chrome',
      executablePath: job.chrome.path,
      headless: true,
      chromiumSandbox: true,
      timeout: 12000,
    })
    assert.equal(browser.version(), job.chrome.version)
    controller.signal.throwIfAborted()
    phase = 'scenario'
    const { runOwnedScenario } = await import(pathToFileURL(job.scenarioEntry).href)
    result = await runOwnedScenario({
      browser,
      signal: controller.signal,
      requestStop,
      bindingPath: job.binding.path,
      bindingSha256: job.binding.sha256,
      provider,
    })
    assert.equal(result.ownerCleanupRequired, true)
    assert.equal(result.passed, true)
    assert.equal(result.sshClosed, true)
  } catch {
    primary = phase
  } finally {
    clearInterval(timer)
    try {
      await close()
    } catch {
      primary ??= 'normal-close'
    }
    try {
      provider?.dispose()
    } catch {
      primary ??= 'provider-dispose'
    }
    const functionalPassed =
      !primary && result?.passed === true && result?.sshClosed === true && closed
    put('run-complete.json', {
      state: functionalPassed ? 'PASS' : 'NEG',
      functionalPassed,
      browserClosed: closed,
      sshClosed: result?.sshClosed === true,
      primary,
    })
    // Receipt acceptance is not a cleanup claim. The owner still observes the
    // retained root exit and authoritative empty job after this cooperative ACK.
    const ackEnd = Math.min(Date.now() + 10000, Date.parse(job.workEndUtc))
    let accepted = false
    while (Date.now() < ackEnd && !existsSync(join(directory, 'completion-ack.json')))
      await delay(20)
    if (existsSync(join(directory, 'completion-ack.json'))) {
      const ack = JSON.parse(readFileSync(join(directory, 'completion-ack.json'), 'utf8'))
      accepted = ack.nonce === nonce && ack.pid === process.pid
    }
    if (!functionalPassed || !accepted) process.exitCode = 1
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runNativeBrowser(process.argv[2], process.argv[3]).catch(() => {
    process.exitCode = 1
  })
}
