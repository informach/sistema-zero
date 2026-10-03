import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { BrowserEvent } from '../../src/analytics/protocol'

const base = process.env.ANALYTICS_CAPTURE_URL || 'http://localhost:4321'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
const browser = await chromium.launch()
const failures: string[] = []
const check = (condition: unknown, message: string) => {
  if (!condition) failures.push(message)
}
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.addCookies([{ name: 'sz_metrics', value: 'rejected', url: base }])
  const page = await context.newPage()
  const events: Array<Record<string, unknown>> = []
  let sessions = 0
  await context.route('**/api/analytics/**', async (route) => {
    const body = route.request().postDataJSON()
    if (route.request().url().endsWith('/session')) {
      sessions++
      await route.fulfill({
        json: {
          sessionId: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + (sessions === 1 ? 100 : 1800000)).toISOString(),
        },
      })
    } else {
      events.push(...body.events)
      await route.fulfill({ json: { accepted: body.events.map((e: { id: string }) => e.id) } })
    }
  })
  await page.goto(base)
  await page.evaluate(async () => {
    document.body.innerHTML =
      '<main><h1>Teste público</h1><div data-analytics-private><details><summary>Privado</summary>Segredo</details><video></video></div><div id="question" data-analytics-question="q1" data-analytics-quiz="' +
      'a'.repeat(64) +
      '" data-analytics-attempt="00000000-0000-4000-8000-000000000001" data-analytics-position="1"><button>Responder</button></div></main>'
    const modulePath = '/src/analytics/collector.ts'
    const { startCollector } = await import(/* @vite-ignore */ modulePath)
    Object.assign(window, {
      qaStop: await startCollector({
        path: '/',
        publicText: true,
        definition: '',
        release: 'test',
      }),
    })
  })
  await page.waitForTimeout(1300)
  await page.evaluate(() => {
    document.querySelector('details')!.open = true
    document.querySelector('video')!.dispatchEvent(new Event('play'))
    document
      .querySelector('#question')!
      .setAttribute('data-analytics-attempt', '00000000-0000-4000-8000-000000000002')
  })
  await page.waitForTimeout(5500)
  check(
    !events.some((e) => ['details_open', 'video_start'].includes(String(e.name))),
    'Private details/video must never generate events',
  )
  check(
    new Set(events.filter((e) => e.name === 'quiz_question_view').map((e) => e.quizAttemptId))
      .size === 2,
    'A restarted quiz must record the same question for the new attempt',
  )
  const id = await page.evaluate(async () => {
    const node = document.createElement('div')
    node.id = 'parent'.repeat(25)
    node.innerHTML =
      '<custom-element-long-name><another-element-long-name><button>Teste</button></another-element-long-name></custom-element-long-name>'
    document.querySelector('main')!.append(node)
    const path = '/src/analytics/dom.ts'
    return (await import(/* @vite-ignore */ path)).elementId(node.querySelector('button')) as string
  })
  check(
    BrowserEvent.safeParse({
      id: crypto.randomUUID(),
      pageViewId: crypto.randomUUID(),
      name: 'click',
      path: '/',
      revision: 'a'.repeat(64),
      at: new Date().toISOString(),
      elementId: id,
    }).success,
    'Discovered identifiers must fit the ingestion protocol',
  )
  const revisions = await page.evaluate(async () => {
    const path = '/src/analytics/dom.ts'
    const { pageRevision } = await import(/* @vite-ignore */ path)
    history.replaceState(null, '', '/como-funciona')
    const first = await pageRevision(true, '', 'test')
    history.replaceState(null, '', '/como-funciona/')
    return [first, await pageRevision(true, '', 'test')]
  })
  check(
    revisions[0] === revisions[1],
    'Trailing slash must not create another revision of the same page',
  )
  const styled = await page.evaluate(async () => {
    const path = '/src/analytics/dom.ts'
    const { pageRevision } = await import(/* @vite-ignore */ path)
    const before = await pageRevision(true, '', 'test')
    document.querySelector('main')!.className = 'another-layout-variant'
    return [before, await pageRevision(true, '', 'test')]
  })
  check(styled[0] !== styled[1], 'Different layout variants must not share a screenshot revision')
  await page.locator('#question button').click()
  await page.waitForTimeout(500)
  check(
    events.some((event) => event.name === 'click'),
    'The first click after inactivity must survive session renewal',
  )
  const count = events.length
  await page.evaluate(async () => {
    ;(window as unknown as { qaStop: () => void }).qaStop()
    const path = '/src/analytics/collector.ts'
    const { startCollector } = await import(/* @vite-ignore */ path)
    const controller = new AbortController()
    const starting = startCollector(
      { path: '/', publicText: true, definition: '', release: 'test' },
      controller.signal,
    )
    controller.abort()
    await starting
  })
  await page.waitForTimeout(500)
  check(events.length === count, 'Revocation during asynchronous startup must prevent collection')
  await page.evaluate(async () => {
    const path = '/src/analytics/collector.ts'
    const { startCollector } = await import(/* @vite-ignore */ path)
    const stop = await startCollector({
      path: '/',
      publicText: false,
      definition: 'a'.repeat(64),
      release: 'test',
    })
    const question = document.querySelector('#question')!
    question.setAttribute('data-analytics-question', 'fast-question')
    question.innerHTML = '<form><button type="button">Continuar</button></form>'
    question.querySelector('button')!.click()
    question.remove()
    setTimeout(stop, 5500)
  })
  await page.waitForTimeout(5200)
  check(
    events.some(
      (event) => event.name === 'quiz_question_view' && event.questionId === 'fast-question',
    ),
    'Fast answers inside a form must record the question without collecting the form',
  )
  await context.close()

  // Deactivation while the session opening is already on the server: stop() waits for it
  // (the deletion needs its visitor cookie) and nothing is sent after stop.
  const deactivation = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await deactivation.addCookies([{ name: 'sz_metrics', value: 'rejected', url: base }])
  let releaseOpening!: () => void
  const openingHeld = new Promise<void>((resolve) => {
    releaseOpening = resolve
  })
  let opened = 0
  let stopped = false
  let sentAfterStop = 0
  await deactivation.route('**/api/analytics/**', async (route) => {
    if (route.request().url().endsWith('/session')) {
      opened++
      await openingHeld
      await route.fulfill({
        json: {
          sessionId: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
        },
      })
    } else {
      if (stopped) sentAfterStop++
      const body = route.request().postDataJSON()
      await route.fulfill({ json: { accepted: body.events.map((e: { id: string }) => e.id) } })
    }
  })
  const held = await deactivation.newPage()
  await held.goto(base)
  await held.evaluate(async () => {
    const path = '/src/analytics/collector.ts'
    const { startCollector } = await import(/* @vite-ignore */ path)
    Object.assign(window, {
      qaHeldStop: await startCollector({
        path: '/',
        publicText: true,
        definition: '',
        release: 'test',
      }),
    })
  })
  await held.waitForTimeout(500)
  check(opened === 1, 'The session opening must be in flight before deactivation')
  stopped = true
  await held.evaluate(() => {
    const w = window as unknown as {
      qaHeldStop: () => Promise<void>
      qaStopped: Promise<void>
      qaSettled: boolean
    }
    w.qaSettled = false
    w.qaStopped = w.qaHeldStop().then(() => {
      w.qaSettled = true
    })
  })
  await held.waitForTimeout(500)
  check(
    (await held.evaluate('window.qaSettled')) === false,
    'stop() must wait for the session opening already on the server',
  )
  releaseOpening()
  await held.evaluate('window.qaStopped')
  check(
    (await held.evaluate('window.qaSettled')) === true,
    'stop() settles once the session opening ends',
  )
  await held.waitForTimeout(5500)
  check(sentAfterStop === 0, 'Nothing is sent after stop, even if the session answer arrives later')
  await deactivation.close()
  assert.deepEqual(failures, [])
  console.log(
    'Collector regression checks passed: privacy, restart, identifiers, canonical revision',
  )
} finally {
  await browser.close()
}
