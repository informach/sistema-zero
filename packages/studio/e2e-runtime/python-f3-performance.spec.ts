import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { prepareSpaceQualification } from '../../../experiments/studio-python-runtime/qualification/space_arena'
import {
  enableCausalPresentation,
  evaluate,
  instrumentPresentation,
  providerState,
  readPresentation,
  resetPresentation,
  TWO_DISPLAY_FRAMES_MS,
} from './gamePerformance'
import { performanceWindow } from './performanceAcceptance'

// F3 of the performance contract: a game with 20 turtles, keyboard and mouse, timers and
// images, using the same compensated 60 Hz loop as the reference games. Images are the real
// Space Arena GIF materials. Bounds: input -> presentation p95 <= 100 ms, paint slices
// p95 <= 8 ms, no task > 50 ms, and a presented-frame interval p95 of at most two display
// frames (>= 30 FPS) with at most 1% of intervals longer than that. The contract wrote the
// frame bound as 33 ms; presented frames are vsync-aligned, so one missed vsync measures
// 33.3 ms at 60 Hz. The user accepted reading it as two display frames on 21/10/2026.
const WINDOW = performanceWindow(process.env.SZ_F3_PLAY_MS)
const PLAY_MS = WINDOW.milliseconds
const F3 = `import math
import time
import turtle
from _qa_input_presentation import InputPresentation

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
qa = InputPresentation(wn)
last_dx = last_dy = 0


def pose():
    return dict(x=player.xcor(), y=player.ycor(), heading=player.heading(), dx=last_dx, dy=last_dy)


def press(name):
    qa.begin(name, pose())
    keys[name] = 1


def click(x, y):
    before = pose()
    before['target'] = (x, y)
    qa.begin('click', before)
    player.goto(x, y)


for name in keys:
    wn.onkeypress(lambda name=name: press(name), name)
    wn.onkeyrelease(lambda name=name: keys.__setitem__(name, 0), name)
wn.onscreenclick(click)
assert len(wn.turtles()) == 20


def tick():
    global last_dx, last_dy
    started = time.monotonic()
    for mover in movers:
        mover.forward(3)
        if abs(mover.xcor()) > 380 or abs(mover.ycor()) > 280:
            mover.right(180)
    player.left(5 * (keys["Left"] - keys["Right"]))
    x, y = player.position()
    player.forward(4 * keys["Up"])
    last_dx, last_dy = player.xcor() - x, player.ycor() - y
    qa.rendered(pose(), visible=-390 < player.xcor() < 390 and -290 < player.ycor() < 290,
                active=player.isvisible())
    wn.update()
    elapsed_ms = (time.monotonic() - started) * 1000
    wn.ontimer(tick, max(1, math.ceil(1000 / 60 - elapsed_ms)))


wn.listen()
print("F3 ready")
tick()
wn.mainloop()
`

test.use({ trace: 'off' })

test(`${WINDOW.qualification} F3: 20 turtles with causal keyboard/mouse presentation, timers and images`, async ({
  page,
  request,
}, info) => {
  test.setTimeout(PLAY_MS + 120_000)
  const baseline = await prepareSpaceQualification(request)
  const project = structuredClone(baseline.project)
  project.tree['f3.py'] = { kind: 'file', content: F3 }
  project.tree['_qa_input_presentation.py'] = {
    kind: 'file',
    content: await readFile(
      new URL(
        '../../../experiments/studio-python-runtime/qualification/input_presentation.py',
        import.meta.url,
      ),
      'utf8',
    ),
  }
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
    await enableCausalPresentation(frame)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas without layout')
    const began = performance.now()
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
    const remaining = PLAY_MS - (performance.now() - began)
    if (remaining > 0) await page.waitForTimeout(remaining)
    const measuredPlayMs = performance.now() - began
    const presentation = await readPresentation(frame)
    await info.attach('f3-presentation', {
      body: JSON.stringify(
        {
          playMs: PLAY_MS,
          measuredPlayMs,
          qualification: WINDOW.qualification,
          witness:
            'QA6x6 RGB token after original pose effect, same Turtle update;20 turtles;read-only RAF observation plus one display opportunity,not GPU scanout',
          ...presentation,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    })
    expect(presentation.inputs).toBe(30)
    expect(measuredPlayMs).toBeGreaterThanOrEqual(PLAY_MS)
    expect(presentation.causalFailure).toBeUndefined()
    expect(presentation.causalInputToPresentation.count).toBe(30)
    expect(presentation.intervals.count).toBeGreaterThan(PLAY_MS / 40)
    expect(presentation.intervals.p95).toBeLessThanOrEqual(TWO_DISPLAY_FRAMES_MS)
    expect(presentation.frameBuckets.more).toBeLessThanOrEqual(presentation.intervals.count / 100)
    expect(presentation.paintWork.p95).toBeLessThanOrEqual(8)
    expect(presentation.longPaints).toBe(0)
    expect(presentation.longTasks).toBe(0)
    expect(presentation.causalInputToPresentation.p95).toBeLessThanOrEqual(100)
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
