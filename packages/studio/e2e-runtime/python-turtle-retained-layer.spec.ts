import { createHash } from 'node:crypto'
import { type APIRequestContext, type Browser, expect, test } from '@playwright/test'
import { prepareSpaceQualification } from '../../../experiments/studio-python-runtime/qualification/space_arena'
import { evaluate, providerState } from './gamePerformance'

// The renderer keeps the unchanged start of a long drawing as pixels (retained layer). A
// drawing presented step by step, with deleted stamps, clear, a background change and a
// moving turtle in between, must end with exactly the pixels of the same scene painted once.
const scene = (progressive: boolean) => `import turtle

PROGRESSIVE = ${progressive ? 'True' : 'False'}
wn = turtle.Screen()
wn.setup(600, 500)
wn.bgcolor("white")
wn.tracer(0)
pen = turtle.Turtle()
pen.speed(0)
other = turtle.Turtle()
other.penup()
other.shape("turtle")
other.color("blue")
writer = turtle.Turtle()
writer.hideturtle()
writer.penup()
colors = ["red", "orange", "green", "cyan", "purple", "black"]


def segments(count, offset):
    for index in range(count):
        pen.color(colors[(index + offset) % len(colors)])
        pen.forward(5 + (index * 7) % 120)
        pen.left(61)


def show(times=3):
    if PROGRESSIVE:
        for _ in range(times):
            wn.update()


for block in range(10):
    segments(100, block)
    other.goto(block * 10 - 50, 100)
    show()
writer.goto(-200, -200)
writer.write("pontos 1", font=("Arial", 16, "normal"))
show()
writer.clear()
writer.write("pontos 2", font=("Arial", 16, "normal"))
show()
stamps = []
for index in range(80):
    other.goto(index * 6 - 240, -150)
    stamps.append(other.stamp())
show()
for stamp in stamps[:40]:
    other.clearstamp(stamp)
show()
wn.bgcolor("lightyellow")
show()
segments(200, 3)
other.goto(40, -60)
show()
pen.clear()
show()
segments(150, 5)
wn.update()
print("SCENE DONE")
wn.mainloop()
`

async function paintScene(browser: Browser, request: APIRequestContext, progressive: boolean) {
  const baseline = await prepareSpaceQualification(request)
  const project = structuredClone(baseline.project)
  project.tree['scene.py'] = { kind: 'file', content: scene(progressive) }
  project.python.entrypoint = 'scene.py'
  const page = await browser.newPage()
  await page.route('**/project/spaceArenaPortable', (route) => route.fulfill({ json: project }))
  await page.addInitScript(() => {
    const target = globalThis as typeof globalThis & { __szLayerDraws?: number }
    target.__szLayerDraws = 0
    const draw = CanvasRenderingContext2D.prototype.drawImage as (...args: unknown[]) => void
    CanvasRenderingContext2D.prototype.drawImage = function (...args: unknown[]) {
      if (args[0] instanceof HTMLCanvasElement) target.__szLayerDraws!++
      return draw.apply(this, args)
    } as typeof CanvasRenderingContext2D.prototype.drawImage
  })
  await page.goto('/provider')
  const cdp = await page.context().newCDPSession(page)
  try {
    await expect.poll(() => evaluate(cdp, '!!globalThis.providerProbe')).toBe(true)
    await evaluate(cdp, "globalThis.providerProbe.prepare('audio','spaceArenaPortable')")
    await page.getByRole('button', { name: 'Jogar', exact: true }).click()
    const output = async () => {
      const state = await providerState(cdp)
      if (state.status !== 'failed')
        return `${state.status}: ${state.events.map((event) => event.text ?? '').join('')}`
      // Diagnostics carry more than the typed console fields.
      return `failed: ${JSON.stringify(await evaluate(cdp, "globalThis.providerProbe.read('audio').events"))}`
    }
    await expect
      .poll(async () => /SCENE DONE|^(failed|completed|stopped):/.test(await output()), {
        timeout: 60_000,
      })
      .toBe(true)
    expect(await output()).toContain('SCENE DONE')
    const frame = page.frames().find((item) => item.url().includes('/frame.html'))
    if (!frame) throw new Error('Missing protected frame')
    // The final update paints at once or in the next animation frame.
    await frame.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    )
    return await frame.evaluate(() => {
      const canvas = document.querySelector('canvas')!
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
      return {
        width: canvas.width,
        height: canvas.height,
        pixels: [...pixels],
        layerDraws: (globalThis as typeof globalThis & { __szLayerDraws: number }).__szLayerDraws,
      }
    })
  } finally {
    await page
      .getByRole('button', { name: 'Parar', exact: true })
      .click()
      .catch(() => {})
    await evaluate(cdp, "globalThis.providerProbe.dispose('audio')").catch(() => {})
    await page.close()
  }
}

test('a drawing presented step by step ends with the pixels of one complete paint', async ({
  browser,
  request,
}) => {
  test.setTimeout(150_000)
  const progressive = await paintScene(browser, request, true)
  const complete = await paintScene(browser, request, false)
  // The progressive run used the retained layer; the single paint had nothing to retain.
  expect(progressive.layerDraws).toBeGreaterThan(0)
  expect(complete.layerDraws).toBe(0)
  expect([progressive.width, progressive.height]).toEqual([complete.width, complete.height])
  let differing = 0
  for (let index = 0; index < complete.pixels.length; index += 4)
    for (let channel = 0; channel < 4; channel++)
      if (progressive.pixels[index + channel] !== complete.pixels[index + channel]) {
        differing++
        break
      }
  const digest = (pixels: number[]) =>
    createHash('sha256').update(Uint8Array.from(pixels)).digest('hex')
  expect({ differing, digest: digest(progressive.pixels) }).toEqual({
    differing: 0,
    digest: digest(complete.pixels),
  })
})
