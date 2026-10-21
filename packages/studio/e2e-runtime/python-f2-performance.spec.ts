import { expect, test } from '@playwright/test'
import { prepareSpaceQualification } from '../../../experiments/studio-python-runtime/qualification/space_arena'
import {
  evaluate,
  instrumentPresentation,
  providerState,
  readPresentation,
  resetPresentation,
} from './gamePerformance'

// F2 of the performance contract: art with 10,000 segments, several colors and a controlled
// animation (one update every 100 segments). Bounds: main-thread paint slices p95 <= 8 ms and
// no renderer task above 50 ms under the contracted load; every segment kept (none dropped).
const F2 = `import turtle

wn = turtle.Screen()
wn.setup(900, 700)
wn.bgcolor("black")
wn.tracer(0)
artist = turtle.Turtle()
artist.hideturtle()
artist.speed(0)
colors = ["red", "orange", "yellow", "green", "cyan", "blue", "magenta", "white"]
drawn = 0


def step():
    global drawn
    for _ in range(100):
        artist.color(colors[drawn % len(colors)])
        artist.forward(2 + (drawn % 200))
        artist.left(59)
        drawn += 1
    wn.update()
    if drawn < 10000:
        wn.ontimer(step, 16)
    else:
        print("F2 done", drawn)


print("F2 ready")
step()
wn.mainloop()
`

test.use({ trace: 'off' })

test('F2: 10,000 colored segments animate without long tasks or heavy paint slices', async ({
  page,
  request,
}, info) => {
  test.setTimeout(180_000)
  const baseline = await prepareSpaceQualification(request)
  const project = structuredClone(baseline.project)
  project.tree['f2.py'] = { kind: 'file', content: F2 }
  project.python.entrypoint = 'f2.py'
  await page.route('**/project/spaceArenaPortable', (route) => route.fulfill({ json: project }))
  await instrumentPresentation(page)
  await page.goto('/provider')
  const cdp = await page.context().newCDPSession(page)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  const output = async () =>
    (await providerState(cdp)).events
      .filter((event) => event.type === 'console')
      .map((event) => event.text ?? '')
      .join('')
  try {
    await expect.poll(() => evaluate(cdp, '!!globalThis.providerProbe')).toBe(true)
    await evaluate(cdp, "globalThis.providerProbe.prepare('audio','spaceArenaPortable')")
    const clicked = Date.now()
    await page.getByRole('button', { name: 'Jogar', exact: true }).click()
    await expect.poll(output, { timeout: 30_000 }).toContain('F2 ready')
    const frame = page.frames().find((item) => item.url().includes('/frame.html'))
    if (!frame) throw new Error('Missing protected frame')
    await resetPresentation(frame)
    const ready = Date.now()
    await expect.poll(output, { timeout: 120_000 }).toContain('F2 done 10000')
    const drawingMs = Date.now() - ready
    await page.waitForTimeout(500)
    const presentation = await readPresentation(frame)
    const report = { startupMs: ready - clicked, drawingMs, ...presentation }
    await info.attach('f2-presentation', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    })
    // 99 updates follow the reset; two updates inside one display frame share a presentation,
    // so the animation is required to span many presented frames, not exactly one per update.
    expect(presentation.intervals.count).toBeGreaterThanOrEqual(50)
    expect(presentation.paintWork.count).toBeGreaterThanOrEqual(50)
    expect(presentation.paintWork.p95).toBeLessThanOrEqual(8)
    expect(presentation.longPaints).toBe(0)
    expect(presentation.longTasks).toBe(0)
    expect(errors).toEqual([])
  } finally {
    await page.getByRole('button', { name: 'Parar', exact: true }).click().catch(() => {})
    await evaluate(cdp, "globalThis.providerProbe.dispose('audio')").catch(() => {})
    await cdp.detach().catch(() => {})
  }
})
