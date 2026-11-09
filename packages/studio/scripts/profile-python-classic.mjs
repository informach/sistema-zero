import { deepStrictEqual } from 'node:assert'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

// Run against the existing local Python editor qualification servers (5297/5298).
// CPU profiles are diagnostic, never evidence of an uninstrumented frame budget.
const label = process.argv[2] || 'current'
if (!/^[a-z0-9_-]+$/i.test(label)) throw new Error('Use a simple name for the measurement')
const output = new URL('../.cache/python-classic-performance/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.setDefaultTimeout(30_000)
await page.addInitScript(() => {
  globalThis.audioTimings = []
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function (...args) {
    const start = performance.now()
    const result = play.apply(this, args)
    result.then(
      () => audioTimings.push({ start, duration: performance.now() - start }),
      () => {},
    )
    return result
  }
})
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
page.on('console', (e) => {
  if (e.type() === 'error') console.log('CONSOLE', e.text())
})
page.on('requestfailed', (r) => console.log('REQUESTFAILED', r.url(), r.failure()))
page.on('response', (r) => {
  if (r.status() >= 400) console.log('RESPONSE', r.status(), r.url())
})
const client = await page.context().newCDPSession(page)
const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    n: values.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    max: sorted.at(-1),
    over50: values.filter((x) => x > 50).length,
  }
}
try {
  await page.goto('http://127.0.0.1:5298')
  await page.waitForFunction(() => !!globalThis.studioFreeProbe)
  await page.evaluate(() => studioFreeProbe.create(false, false, true))
  await page.locator('select[name="kit-language"]').selectOption('python')
  await page.getByRole('button').filter({ hasText: 'Pac-Man (Blocos)' }).click()
  await page.waitForFunction(
    () => {
      if (document.querySelector('[role="alert"]'))
        throw new Error(document.querySelector('[role="alert"]').textContent)
      try {
        return studioFreeProbe.workspace().count > 100
      } catch {
        return false
      }
    },
    {},
    { timeout: 90000 },
  )
  const originalFiles = await page.evaluate(async () => (await studioFreeProbe.saved()).files)
  if (process.env.PERF_COLLAPSE) await page.evaluate(() => studioFreeProbe.focusProgramRoot(true))
  await page.waitForTimeout(1500)
  const workspace = await page.evaluate(() => studioFreeProbe.workspace())
  console.log('WORKSPACE', workspace)
  await client.send('Profiler.enable')
  await client.send('Profiler.start')
  const focus = await page.evaluate(() => ({ blockId: studioFreeProbe.focusProgramRoot() }))
  const block = page.locator(`[data-id="${focus.blockId}"]`)
  const box = await block.evaluate((el) => {
    let parent = el
    while (parent.parentElement.closest('g[data-id]'))
      parent = parent.parentElement.closest('g[data-id]')
    const b = parent.getBoundingClientRect()
    return { x: b.x, y: b.y, width: b.width, height: b.height }
  })
  console.log('FOCUS', focus, box)
  await page.evaluate(() => {
    globalThis.perf = { rafs: [], tasks: [], last: performance.now(), running: true }
    new PerformanceObserver((l) =>
      perf.tasks.push(...l.getEntries().map((e) => e.duration)),
    ).observe({ type: 'longtask' })
    const frame = (t) => {
      perf.rafs.push(t - perf.last)
      perf.last = t
      if (perf.running) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
  if (box && process.env.PERF_EDITOR !== '0') {
    await page.mouse.move(box.x + 20, box.y + 10)
    await page.mouse.down()
    await page.mouse.move(box.x + 160, box.y + 90, { steps: 40 })
    await page.mouse.up()
  }
  await page.waitForTimeout(3500)
  const editor = await page.evaluate(() => {
    perf.running = false
    return perf
  })
  const { profile } = await client.send('Profiler.stop')
  await writeFile(new URL(`${label}-editor.cpuprofile`, output), JSON.stringify(profile))
  console.log('EDITOR', stats(editor.rafs), stats(editor.tasks))
  deepStrictEqual(
    await page.evaluate(async () => (await studioFreeProbe.saved()).files),
    originalFiles,
  )
  await page.getByRole('button', { name: /^(Rodar|Rodar de novo)$/ }).click()
  const canvas = page.frameLocator('iframe[src*="/frame.html"]').locator('canvas')
  await canvas.waitFor({ timeout: 90000 })
  await page.waitForTimeout(3000)
  await canvas.click()
  await canvas.press('ArrowRight')
  const runtime = page.frames().find((f) => f.url().includes('/frame.html'))
  await runtime.evaluate(() => {
    globalThis.perf = {
      paints: [],
      tasks: [],
      last: performance.now(),
      original: CanvasRenderingContext2D.prototype.clearRect,
    }
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.isConnected) {
        const now = performance.now()
        perf.paints.push(now - perf.last)
        perf.last = now
      }
      return perf.original.apply(this, args)
    }
    new PerformanceObserver((l) =>
      perf.tasks.push(...l.getEntries().map((e) => e.duration)),
    ).observe({ type: 'longtask' })
  })
  if (process.env.PERF_TRACE)
    await client.send('Tracing.start', {
      categories:
        'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-v8.cpu_profiler,v8,blink.user_timing',
      transferMode: 'ReturnAsStream',
    })
  if (process.env.PERF_PROFILE) await client.send('Profiler.start')
  // Profilers pause the renderer while starting. They must settle before samples.
  await page.waitForTimeout(700)
  await runtime.evaluate(() => {
    perf.paints = []
    perf.tasks = []
    perf.last = performance.now()
  })
  for (const key of ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']) {
    await canvas.press(key)
    await page.waitForTimeout(2500)
  }
  const runtimePerf = await runtime.evaluate(() => {
    CanvasRenderingContext2D.prototype.clearRect = perf.original
    return { paints: perf.paints, tasks: perf.tasks, audio: audioTimings }
  })
  runtimePerf.hostAudio = await page.evaluate(() => audioTimings)
  console.log('AUDIO', runtimePerf.hostAudio)
  const runtimeProfile = process.env.PERF_PROFILE
    ? await client.send('Profiler.stop')
    : { profile: {} }
  if (process.env.PERF_TRACE) {
    const completed = new Promise((resolve) => client.once('Tracing.tracingComplete', resolve))
    await client.send('Tracing.end')
    const { stream } = await completed
    let trace = ''
    while (true) {
      const chunk = await client.send('IO.read', { handle: stream })
      trace += chunk.data
      if (chunk.eof) break
    }
    await client.send('IO.close', { handle: stream })
    await writeFile(new URL(`${label}-trace.json`, output), trace)
  }
  if (process.env.PERF_PROFILE)
    await writeFile(
      new URL(`${label}-runtime.cpuprofile`, output),
      JSON.stringify(runtimeProfile.profile),
    )
  const result = {
    label,
    workspace,
    editor: { raf: stats(editor.rafs), tasks: stats(editor.tasks) },
    runtime: { frames: stats(runtimePerf.paints.slice(1)), tasks: stats(runtimePerf.tasks) },
    raw: { editor, runtime: runtimePerf },
  }
  await writeFile(new URL(`${label}-metrics.json`, output), JSON.stringify(result, null, 2))
  console.log('RESULT', JSON.stringify({ ...result, raw: undefined }))
  await page.screenshot({ path: fileURLToPath(new URL(`${label}.png`, output)) })
} catch (error) {
  console.error(error)
  console.error((await page.locator('body').innerText()).slice(0, 2500))
  throw error
} finally {
  await page.evaluate(() => globalThis.studioFreeProbe?.close()).catch(() => {})
  await browser.close()
}
