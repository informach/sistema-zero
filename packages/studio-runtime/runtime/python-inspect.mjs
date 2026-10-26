import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import {
  createPythonBrowserResources,
  installPythonBrowserResourceRoutes,
} from './python-browser-resources.mjs'

// This trusted process only serves verified data to the compile-only inspector.
// Learner files are never imported or executed by Node or by the inspector.
let inspectionPhase = 'options'
process.on('uncaughtExceptionMonitor', () => {
  console.error(`STUDIO_PYTHON_INSPECTION_PHASE:${inspectionPhase}`)
})
const root = process.cwd()
const optionsBytes = await fs.readFile(path.join(root, 'python-inspection-options.json'))
if (optionsBytes.length > 2_000_000) throw new Error('Inspection options exceed the limit')
const options = JSON.parse(optionsBytes.toString('utf8'))
if (typeof options.structure !== 'boolean') throw new Error('Inspection structure mode is required')
inspectionPhase = 'resources'
const resourceConfiguration = await createPythonBrowserResources(root, options)
const { resources, parent, runtime, runtimePrefix } = resourceConfiguration
if (
  !resources.has(`${runtime}${runtimePrefix}inspect.mjs`) ||
  !resources.has(`${runtime}${runtimePrefix}analysis.html`)
)
  throw new Error('Approved runtime does not provide byte inspection')
resources.set(`${parent}/payload.json`, {
  bytes: Buffer.from(JSON.stringify(options.payload)),
  type: 'application/json',
})
resources.set(`${parent}/`, {
  bytes: Buffer.from(
    `<!doctype html><html data-python-structure="${options.structure}"><head><meta charset="utf-8"><title>Python inspection</title><script type="module" src="${runtime}${runtimePrefix}inspect.mjs"></script></head><body></body></html>`,
  ),
  type: 'text/html; charset=utf-8',
})
let browser
const deadline = setTimeout(() => {
  console.error('STUDIO_PYTHON_INSPECTION_TIMEOUT')
  process.exit(1)
}, 110_000)
try {
  inspectionPhase = 'launch'
  browser = await chromium.launch({ headless: true, timeout: 15_000 })
  inspectionPhase = 'context'
  const context = await browser.newContext({ acceptDownloads: false })
  await installPythonBrowserResourceRoutes(context, resourceConfiguration)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message.slice(0, 2000)))
  inspectionPhase = 'navigation'
  await page.goto(`${parent}/`, { timeout: 15_000 })
  inspectionPhase = 'wait'
  await page.waitForFunction(() => Reflect.has(globalThis, '__studioPythonInspection'), null, {
    timeout: 90_000,
  })
  inspectionPhase = 'result'
  const result = await page.evaluate(() => Reflect.get(globalThis, '__studioPythonInspection'))
  if (result?.ok !== true || errors.length || page.frames().length !== 1)
    throw new Error(result?.message ?? errors[0] ?? 'Python inspector did not finish cleanly')
  const report = JSON.stringify(result.report)
  if (Buffer.byteLength(report) > 2 * 1024 * 1024)
    throw new Error('Python inspection report exceeds the limit')
  inspectionPhase = 'write-report'
  await fs.writeFile(path.join(root, 'python-inspection-result.json'), report, { flag: 'wx' })
  console.log(
    JSON.stringify({ ok: true, status: result.report.status, files: result.report.files.length }),
  )
} finally {
  clearTimeout(deadline)
  await browser?.close()
}
