import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import {
  createPythonBrowserResources,
  installPythonBrowserResourceRoutes,
  pythonBrowserParentConnectSources,
} from './python-browser-resources.mjs'
import {
  STUDIO_PYTHON_PLAYTEST_LIMITS,
  StudioPythonPlaytestRecipeSchema,
  studioPythonPlayerPage,
  verifyStudioPythonPlaytestCapture,
  verifyStudioPythonPlaytestReport,
} from './python-playtest.generated.mjs'

// Trusted Node only serves verified bytes. All learner Python executes in the protected worker.
const root = process.cwd()
const optionsBytes = await fs.readFile(path.join(root, 'python-playtest-options.json'))
if (optionsBytes.length > 2_000_000) throw new Error('Playtest options exceed the limit')
const options = JSON.parse(optionsBytes.toString('utf8'))
const recipe = StudioPythonPlaytestRecipeSchema.parse(options.recipe)
const configuration = await createPythonBrowserResources(root, options)
const { resources, parent, runtime, runtimePrefix } = configuration
if (
  !resources.has(`${runtime + runtimePrefix}playtest.mjs`) ||
  !resources.has(`${runtime + runtimePrefix}frame.html`)
)
  throw new Error('Approved runtime does not provide protected playtest')
const pageTemplate = studioPythonPlayerPage(options.runtimeManifestSha256, {
  runtimeDirectoryURL: runtime + runtimePrefix,
  bootstrap: 'playtest',
})
for (const [name, bytes, type] of [
  ['', Buffer.from(pageTemplate.html), 'text/html; charset=utf-8'],
  ['player.css', Buffer.from(pageTemplate.css), 'text/css; charset=utf-8'],
  ['payload.json', Buffer.from(JSON.stringify(options.payload)), 'application/json'],
  ['playtest-recipe.json', Buffer.from(JSON.stringify(recipe)), 'application/json'],
])
  resources.set(`${parent}/${name}`, { bytes, type })
let browser
const deadline = setTimeout(() => {
  console.error('STUDIO_PYTHON_PLAYTEST_TIMEOUT')
  process.exit(1)
}, 110_000)
try {
  browser = await chromium.launch({ headless: true, timeout: 15_000 })
  const context = await browser.newContext({
    acceptDownloads: false,
    viewport: { width: 1200, height: 900 },
  })
  await installPythonBrowserResourceRoutes(
    context,
    configuration,
    `default-src 'none'; script-src ${runtime}${runtimePrefix}; style-src 'self'; connect-src ${pythonBrowserParentConnectSources(configuration)}; frame-src ${runtime}${runtimePrefix}; worker-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'`,
  )
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => {
    if (errors.length < 20) errors.push(error.message.slice(0, 2000))
  })
  await page.goto(`${parent}/`, { timeout: 15_000 })
  await page.waitForFunction(
    () => {
      const bridge = Reflect.get(globalThis, '__studioPythonPlaytest')
      if (!bridge) return false
      const view = bridge.view()
      return view.started || view.errors.length
    },
    null,
    { timeout: 30_000 },
  )
  const initial = await page.evaluate(() =>
    Reflect.get(globalThis, '__studioPythonPlaytest').view(),
  )
  if (!initial.ready) throw new Error(initial.errors[0] ?? 'Playtest session did not prepare')
  const readView = () =>
    page.evaluate(() => Reflect.get(globalThis, '__studioPythonPlaytest').view())
  const performAction = async (action) => {
    try {
      await action()
      return true
    } catch (error) {
      // A recorded learner failure is finalized as failed evidence; infrastructure errors still reject.
      if ((await readView()).errors.length) return false
      throw error
    }
  }
  async function driveRecipe() {
    for (let index = 0; index < recipe.stdin.length; index++) {
      await page.waitForFunction(
        () => {
          const view = Reflect.get(globalThis, '__studioPythonPlaytest').view()
          return view.inputPending || view.errors.length || view.state === 'completed'
        },
        null,
        { timeout: 5000 },
      )
      const pendingInput = await page.evaluate(() =>
        Reflect.get(globalThis, '__studioPythonPlaytest').view(),
      )
      if (!pendingInput.inputPending || pendingInput.errors.length) return
      if (
        !(await performAction(() =>
          page.evaluate(() => Reflect.get(globalThis, '__studioPythonPlaytest').submitNextLine()),
        ))
      )
        return
    }
    const canvas = page.frameLocator('#stage iframe').locator('canvas')
    for (let index = 0; index < recipe.keys.length; index++) {
      if ((await readView()).errors.length) return
      if (
        !(await performAction(async () => {
          await canvas.focus({ timeout: 5000 })
          await page.keyboard.press(recipe.keys[index])
          await page.evaluate(
            (index) => Reflect.get(globalThis, '__studioPythonPlaytest').dispatched('key', index),
            index,
          )
        }))
      )
        return
    }
    for (let index = 0; index < recipe.clicks.length; index++) {
      if ((await readView()).errors.length) return
      if (
        !(await performAction(async () => {
          await canvas.waitFor({ state: 'visible', timeout: 5000 })
          const box = await canvas.boundingBox()
          if (!box || box.width <= 0 || box.height <= 0)
            throw new Error('Playtest canvas has no layout')
          const click = recipe.clicks[index]
          await page.mouse.click(
            box.x + Math.min(Math.max(0, box.width - 1), click.x * box.width),
            box.y + Math.min(Math.max(0, box.height - 1), click.y * box.height),
            { button: click.button },
          )
          await page.evaluate(
            (index) => Reflect.get(globalThis, '__studioPythonPlaytest').dispatched('click', index),
            index,
          )
        }))
      )
        return
    }
  }
  await driveRecipe()
  // This is the explicitly requested observation window, not a substitute for readiness events.
  await page.waitForTimeout(recipe.observeMs)
  const result = await page.evaluate(() =>
    Reflect.get(globalThis, '__studioPythonPlaytest').finish(),
  )
  if (errors.length || page.frames().length !== 1)
    throw new Error(errors[0] ?? 'Playtest frame did not retire')
  const report = await verifyStudioPythonPlaytestReport(
    result.report,
    options.payload.snapshot,
    recipe,
  )
  if (report.capture) {
    if (
      typeof result.image?.dataUrl !== 'string' ||
      !result.image.dataUrl.startsWith('data:image/png;base64,')
    )
      throw new Error('Missing playtest capture bytes')
    const bytes = Buffer.from(result.image.dataUrl.slice(22), 'base64')
    await verifyStudioPythonPlaytestCapture(report.capture, bytes)
    await fs.writeFile(path.join(root, report.capture.path), bytes, { flag: 'wx' })
  } else if (result.image) throw new Error('Unexpected playtest capture')
  const json = JSON.stringify(report)
  if (Buffer.byteLength(json) > STUDIO_PYTHON_PLAYTEST_LIMITS.reportBytes)
    throw new Error('Playtest report exceeds the limit')
  await fs.writeFile(path.join(root, 'python-playtest-result.json'), json, { flag: 'wx' })
  console.log(JSON.stringify({ ok: true, status: report.status, captured: !!report.capture }))
} finally {
  clearTimeout(deadline)
  await browser?.close()
}
