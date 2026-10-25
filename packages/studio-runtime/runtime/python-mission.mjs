import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import {
  createPythonBrowserResources,
  installPythonBrowserResourceRoutes,
  pythonBrowserParentConnectSources,
} from './python-browser-resources.mjs'
import {
  PYTHON_MISSION_LIMITS,
  PythonProjectExecutionReportSchema,
  pythonMissionRecipe,
  studioPythonPlayerPage,
  verifyPythonMissionRequest,
  verifyStudioPythonPlaytestReport,
} from './python-playtest.generated.mjs'

// Trusted Node drives verified runtime bytes. No expected answer reaches this process or the learner.
let missionPhase = 'options'
process.on('uncaughtExceptionMonitor', () => {
  console.error(`STUDIO_PYTHON_MISSION_PHASE:${missionPhase}`)
})
const root = process.cwd()
async function phase(value) {
  missionPhase = value
  await fs.writeFile(
    path.join(root, 'python-mission-phase.json'),
    JSON.stringify({ version: 1, phase: value }),
    { mode: 0o600 },
  )
}
await phase('options')
const input = await fs.readFile(path.join(root, 'python-mission-options.json'))
if (input.length > 2_000_000) throw new Error('Mission options exceed the limit')
const options = JSON.parse(input.toString('utf8'))
await phase('resources')
const mission = await verifyPythonMissionRequest(options.mission, options.payload.snapshot)
const configuration = await createPythonBrowserResources(root, options)
const { resources, parent, runtime, runtimePrefix } = configuration
const template = studioPythonPlayerPage(options.runtimeManifestSha256, {
  runtimeDirectoryURL: runtime + runtimePrefix,
  bootstrap: 'playtest',
})
for (const [name, bytes, type] of [
  ['', Buffer.from(template.html), 'text/html; charset=utf-8'],
  ['player.css', Buffer.from(template.css), 'text/css; charset=utf-8'],
  ['payload.json', Buffer.from(JSON.stringify(options.payload)), 'application/json'],
])
  resources.set(`${parent}/${name}`, { bytes, type })

let browser
const deadline = setTimeout(() => {
  console.error('PYTHON_MISSION_DEADLINE')
  process.exit(1)
}, PYTHON_MISSION_LIMITS.runnerMs)
const observations = [],
  executions = []
try {
  await phase('launch')
  browser = await chromium.launch({ headless: true, timeout: 15_000 })
  for (const [index, probe] of mission.probes.entries()) {
    const recipe = pythonMissionRecipe(probe)
    resources.set(`${parent}/playtest-recipe.json`, {
      bytes: Buffer.from(JSON.stringify(recipe)),
      type: 'application/json',
    })
    const context = await browser.newContext({
      acceptDownloads: false,
      viewport: { width: 1200, height: 900 },
    })
    try {
      await installPythonBrowserResourceRoutes(
        context,
        configuration,
        `default-src 'none'; script-src ${runtime}${runtimePrefix}; style-src 'self'; connect-src ${pythonBrowserParentConnectSources(configuration)}; frame-src ${runtime}${runtimePrefix}; worker-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'`,
      )
      const page = await context.newPage(),
        pageErrors = []
      page.on('pageerror', (error) => {
        if (pageErrors.length < 20) pageErrors.push(error.message.slice(0, 2000))
      })
      const view = () => page.evaluate(() => globalThis.__studioPythonPlaytest.view())
      const failed = (message) =>
        page.evaluate(
          (message) => globalThis.__studioPythonPlaytest.programFailure(message),
          message,
        )
      let submittingLine = false,
        inputFailure
      const drainInput = async () => {
        const until = Date.now() + 1000
        while (submittingLine || (await view()).inputPending) {
          if (inputFailure) throw inputFailure
          const current = await view()
          if (
            !submittingLine &&
            current.inputPending &&
            current.input.stdinSubmitted >= recipe.stdin.length
          )
            throw new Error('O programa pediu mais entradas do que o teste oferece.')
          if (Date.now() >= until) throw new Error('O programa não concluiu a entrada do teste.')
          await page.waitForTimeout(10)
        }
        if (inputFailure) throw inputFailure
      }
      const observe = async (value) => {
        await drainInput()
        let timer
        try {
          return await Promise.race([
            page.evaluate((value) => globalThis.__studioPythonPlaytest.observe(value), value),
            new Promise((_, reject) => {
              timer = setTimeout(
                () => reject(new Error('O programa excedeu o prazo da observação.')),
                2000,
              )
            }),
          ])
        } finally {
          clearTimeout(timer)
        }
      }
      await phase('navigation')
      await page.goto(`${parent}/`, { timeout: 15_000 })
      await phase(index === 0 ? 'startup-first' : 'startup-next')
      await page.waitForFunction(
        () => {
          const current = globalThis.__studioPythonPlaytest?.view()
          return current && (current.started || current.errors.length)
        },
        null,
        // Every probe owns a fresh context and interpreter. No warm Python state
        // crosses that isolation boundary, including after the first probe.
        { timeout: 30_000 },
      )
      if (!(await view()).ready) throw new Error('The protected mission session did not prepare')
      await phase('observe')
      // Input can be requested by main.py, a tested function or an event handler.
      // One bounded owner supplies only authored lines throughout the scenario.
      let pumping = true
      const inputPump = recipe.stdin.length
        ? (async () => {
            while (pumping) {
              const current = await view()
              if (current.errors.length) break
              if (current.inputPending) {
                if (current.input.stdinSubmitted >= recipe.stdin.length)
                  throw new Error('O programa pediu mais entradas do que o teste oferece.')
                submittingLine = true
                try {
                  await page.evaluate(() => globalThis.__studioPythonPlaytest.submitNextLine())
                } finally {
                  submittingLine = false
                }
              } else await page.waitForTimeout(10)
            }
          })().catch((error) => {
            inputFailure = error
          })
        : Promise.resolve()
      const observation = { id: probe.id, type: probe.type }
      try {
        await page.waitForTimeout(recipe.observeMs)
        await drainInput()
        if (probe.type === 'functionReturns') {
          const cases = []
          for (const args of probe.args) {
            const result = await observe({
              id: probe.id,
              type: probe.type,
              name: probe.name,
              ...(probe.module ? { module: probe.module } : {}),
              args: [args],
            })
            if (result.observation.type !== 'functionReturns')
              throw new Error('The mission response changed its type')
            if (result.observation.missing) {
              observation.missing = true
              break
            }
            if (result.observation.cases?.length !== 1)
              throw new Error('The mission omitted a function case')
            cases.push(result.observation.cases[0])
          }
          if (!observation.missing) observation.cases = cases
        } else {
          const sample = async () => {
            if (probe.target.kind === 'console') {
              // This real interpreter checkpoint flushes earlier stdout before
              // its response reaches the authenticated collector channel.
              await observe({ type: 'value', path: '__name__' })
              const output = await page.evaluate(() => globalThis.__studioPythonPlaytest.output())
              return { observed: { found: true, value: output.stdout } }
            }
            const result = await observe({
              type: probe.target.kind === 'value' ? 'value' : 'sprite',
              path: probe.target.path,
            })
            if (probe.target.kind === 'value') {
              if (result.observation.type !== 'value') throw new Error('Wrong value observation')
              return { observed: result.observation.observed }
            }
            return {
              observed: result.pose
                ? { found: true, value: result.pose[probe.target.axis] }
                : { found: false },
              pose: result.pose,
            }
          }
          let baselineInitial, baselineFinal
          if (probe.observation) {
            baselineInitial = await sample()
            // A Python checkpoint may precede the actor's first paint while its
            // constructor is still running. Start the control baseline only
            // after an actual presented pose, within a bounded startup window.
            const presentationDeadline = Date.now() + 2000
            while (
              !baselineInitial.pose &&
              Date.now() < presentationDeadline &&
              !(await view()).errors.length
            ) {
              await page.waitForTimeout(25)
              baselineInitial = await sample()
            }
            await page.waitForTimeout(probe.observation.idleMs)
            baselineFinal = await sample()
          }
          const initial = await sample()
          const canvas = page.frameLocator('#stage iframe').locator('canvas')
          for (const step of probe.steps) {
            if ((await view()).errors.length) break
            if (step.action === 'wait') await page.waitForTimeout(step.ms)
            else if (step.action === 'press') {
              await canvas.focus({ timeout: 2000 })
              await page.keyboard.down(step.key)
              try {
                await page.waitForTimeout(step.holdMs ?? 80)
              } finally {
                await page.keyboard.up(step.key)
              }
              // A checkpoint after key-up lets the engine consume its queued release event.
              await sample()
            } else if (step.action === 'click') {
              const box = await canvas.boundingBox()
              const dimensions = await canvas.evaluate((node) => ({
                width: node.width,
                height: node.height,
              }))
              if (!box || step.x >= dimensions.width || step.y >= dimensions.height)
                throw new Error('O ponto do teste está fora da tela do programa.')
              await page.mouse.click(
                box.x + (step.x * box.width) / dimensions.width,
                box.y + (step.y * box.height) / dimensions.height,
              )
              await sample()
            }
          }
          const final = await sample()
          observation.initial = initial.observed
          observation.final = final.observed
          if (
            probe.observation &&
            baselineInitial?.pose &&
            baselineFinal?.pose &&
            initial.pose &&
            final.pose
          )
            observation.motion = {
              baselineInitial: baselineInitial.pose,
              baselineFinal: baselineFinal.pose,
              actionInitial: initial.pose,
              actionFinal: final.pose,
            }
        }
      } catch (error) {
        await failed(error instanceof Error ? error.message : 'O programa não concluiu o teste.')
      } finally {
        pumping = false
        await inputPump
        if (inputFailure)
          await failed(
            inputFailure instanceof Error ? inputFailure.message : 'A entrada do teste falhou.',
          )
      }
      const result = await page.evaluate(() => globalThis.__studioPythonPlaytest.finish())
      if (pageErrors.length || page.frames().length !== 1)
        throw new Error(pageErrors[0] ?? 'The mission frame did not retire')
      const report = await verifyStudioPythonPlaytestReport(
        result.report,
        options.payload.snapshot,
        recipe,
      )
      if (!report.stopped) throw new Error('Mission cleanup was not confirmed')
      if (report.errors.length) observation.errors = report.errors
      observations.push(observation)
      executions.push({ id: probe.id, report })
    } finally {
      await context.close()
    }
  }
  const result = {
    mission: PythonProjectExecutionReportSchema.parse({
      version: 1,
      identity: mission.identity,
      observations,
    }),
    executions,
  }
  const json = JSON.stringify(result)
  if (Buffer.byteLength(json) > PYTHON_MISSION_LIMITS.responseBytes)
    throw new Error('Mission report exceeds the limit')
  await fs.writeFile(path.join(root, 'python-mission-result.json'), json, { flag: 'wx' })
  console.log(JSON.stringify({ ok: true, objectives: observations.length }))
} finally {
  clearTimeout(deadline)
  await browser?.close()
}
