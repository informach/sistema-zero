import { expect, test } from '@playwright/test'
import { prepareSpaceQualification } from '../../../experiments/studio-python-runtime/qualification/space_arena'
import {
  evaluate,
  instrumentPresentation,
  providerState,
  readPresentation,
  resetPresentation,
} from './gamePerformance'

// F3 of the performance contract: a game with 20 turtles, keyboard and mouse, timers and
// images, using the same compensated 60 Hz loop as the reference games. Images are the real
// Space Arena GIF materials. Literal bounds: presented-frame interval p95 <= 33 ms, input ->
// presentation p95 <= 100 ms, paint slices p95 <= 8 ms, no task > 50 ms.
const PLAY_MS = Number(process.env.SZ_F3_PLAY_MS ?? 60_000)
const F3 = `import math
import time
import turtle

wn = turtle.Screen()
wn.setup(800, 600)
wn.bgcolor("black")
wn.tracer(0)
images = ["hunter.gif", "mine.gif", "surveillance.gif", "powerup.gif"]
for image in images:
    wn.register_shape(image)
movers = []
for index in range(19):
    mover = turtle.Turtle()
    mover.penup()
    mover.shape((images + ["turtle"])[index % 5])
    mover.color("white")
    mover.goto(-300 + index * 30, (index % 5) * 60 - 120)
    mover.setheading(index * 19)
    movers.append(mover)
player = turtle.Turtle()
player.shape("turtle")
player.color("yellow")
player.penup()
keys = {"Left": 0, "Right": 0, "Up": 0}
for name in keys:
    wn.onkeypress(lambda name=name: keys.__setitem__(name, 1), name)
    wn.onkeyrelease(lambda name=name: keys.__setitem__(name, 0), name)
wn.onscreenclick(lambda x, y: player.goto(x, y))


def tick():
    started = time.monotonic()
    for mover in movers:
        mover.forward(3)
        if abs(mover.xcor()) > 380 or abs(mover.ycor()) > 280:
            mover.right(180)
    player.left(5 * (keys["Left"] - keys["Right"]))
    player.forward(4 * keys["Up"])
    wn.update()
    elapsed_ms = (time.monotonic() - started) * 1000
    wn.ontimer(tick, max(1, math.ceil(1000 / 60 - elapsed_ms)))


wn.listen()
print("F3 ready")
tick()
wn.mainloop()
`

test.use({ trace: 'off' })

test('F3: 20 turtles with keyboard, mouse, timers and images meet the contract', async ({
  page,
  request,
}, info) => {
  test.setTimeout(PLAY_MS + 120_000)
  const baseline = await prepareSpaceQualification(request)
  const project = structuredClone(baseline.project)
  project.tree['f3.py'] = { kind: 'file', content: F3 }
  project.python.entrypoint = 'f3.py'
  await page.route('**/project/spaceArenaPortable', (route) => route.fulfill({ json: project }))
  await instrumentPresentation(page)
  await page.goto('/provider')
  const cdp = await page.context().newCDPSession(page)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  try {
    await expect.poll(() => evaluate(cdp, '!!globalThis.providerProbe')).toBe(true)
    await evaluate(cdp, "globalThis.providerProbe.prepare('audio','spaceArenaPortable')")
    await page.getByRole('button', { name: 'Jogar', exact: true }).click()
    await expect
      .poll(
        async () =>
          (await providerState(cdp)).events.some((event) => event.text?.includes('F3 ready')),
        { timeout: 30_000 },
      )
      .toBe(true)
    const frame = page.frames().find((item) => item.url().includes('/frame.html'))
    if (!frame) throw new Error('Missing protected frame')
    const canvas = frame.locator('canvas')
    await canvas.focus()
    await page.waitForTimeout(1000)
    await resetPresentation(frame)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas without layout')
    const began = Date.now()
    for (let index = 0; index < 30; index++) {
      if (index % 3 === 2) {
        await page.mouse.click(box.x + box.width * (0.2 + (index % 7) / 10), box.y + box.height / 2)
      } else {
        const key = index % 3 === 0 ? 'ArrowLeft' : 'ArrowUp'
        await page.keyboard.down(key)
        await page.waitForTimeout(120)
        await page.keyboard.up(key)
      }
      await page.waitForTimeout(Math.max(150, PLAY_MS / 30 - 120))
    }
    const remaining = PLAY_MS - (Date.now() - began)
    if (remaining > 0) await page.waitForTimeout(remaining)
    const presentation = await readPresentation(frame)
    await info.attach('f3-presentation', {
      body: JSON.stringify({ playMs: PLAY_MS, ...presentation }, null, 2),
      contentType: 'application/json',
    })
    expect(presentation.inputs).toBe(30)
    expect(presentation.inputToSecondPresentedFrame.count).toBe(30)
    expect(presentation.intervals.count).toBeGreaterThan(PLAY_MS / 40)
    expect(presentation.intervals.p95).toBeLessThanOrEqual(33)
    expect(presentation.paintWork.p95).toBeLessThanOrEqual(8)
    expect(presentation.longPaints).toBe(0)
    expect(presentation.longTasks).toBe(0)
    expect(presentation.inputToSecondPresentedFrame.p95).toBeLessThanOrEqual(100)
    expect(errors).toEqual([])
  } finally {
    await page
      .getByRole('button', { name: 'Parar', exact: true })
      .click()
      .catch(() => {})
    await evaluate(cdp, "globalThis.providerProbe.dispose('audio')").catch(() => {})
    await cdp.detach().catch(() => {})
  }
})
