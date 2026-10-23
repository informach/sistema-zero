import { expect, mock, test } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import { createPythonPlaytestCollector } from '../../../studio/src/runtime/python/playtestCollector'
import { sha256 } from '../../src/artifacts'
import { pythonDistributionFixture } from '../python-distribution-fixture'

// Actual Node driver, Core, collector and filesystem; only Playwright's port is controlled.
// Each scenario runs in a separate Bun realm because mock.module and MJS imports are process-wide.
const scenario = process.env.STUDIO_PYTHON_DRIVER_SCENARIO
if (!['stdin', 'stdin-completed', 'click-race', 'key-race', 'infra-click'].includes(scenario))
  throw new Error('Unknown controlled driver scenario')
let page
let closed = 0
mock.module('playwright-core', () => ({
  chromium: {
    launch: async () => ({
      newContext: async () => ({
        routeWebSocket: async () => {},
        route: async () => {},
        newPage: async () => page,
      }),
      close: async () => {
        closed++
      },
    }),
  },
}))

test(`driver preserves program failure and propagates infrastructure: ${scenario}`, async () => {
  const original = process.cwd()
  const runtime = await pythonDistributionFixture({ playtest: true })
  const directory = path.resolve(
    '../../.cache/studio-python-l0/playtest-driver',
    crypto.randomUUID(),
  )
  const runner = pathToFileURL(path.resolve('runtime/python-playtest.mjs')).href
  await mkdir(path.join(directory, 'runtime'), { recursive: true })
  await mkdir(path.join(directory, 'project'))
  for (const [name, bytes] of runtime.contents)
    await writeFile(path.join(directory, 'runtime', name), bytes)
  const source = new TextEncoder().encode('import absent_student_package\n')
  await writeFile(path.join(directory, 'project/main.py'), source)
  const content = {
    version: 1,
    configuration: {
      runtime: {
        profileId: runtime.deployment.release.profileId,
        releaseId: runtime.deployment.release.releaseId,
        manifestSha256: runtime.deployment.release.manifestSha256,
      },
      extensions: [],
      python: {
        entrypoint: 'main.py',
        dependencyLock: {
          lockVersion: 1,
          target: 'browser',
          pythonVersion: '3.14.2',
          runtimeManifestSha256: runtime.deployment.release.manifestSha256,
          requirementsSha256: await sha256(new Uint8Array()),
          packages: [],
        },
      },
    },
    directories: [],
    files: [
      {
        path: 'main.py',
        kind: 'source',
        sha256: await sha256(source),
        byteLength: source.byteLength,
      },
    ],
  }
  const snapshot = {
    ...content,
    projectId: 'driver-proof',
    revision: await studioPythonExecutionRevision(content),
  }
  const recipe = scenario.startsWith('stdin')
    ? { version: 1, observeMs: 250, stdin: ['Lia'] }
    : scenario === 'key-race'
      ? { version: 1, observeMs: 250, keys: ['Space'] }
      : { version: 1, observeMs: 250, clicks: [{ x: 0.5, y: 0.5 }] }
  await writeFile(
    path.join(directory, 'python-playtest-options.json'),
    JSON.stringify({
      version: 1,
      runtimeManifestSha256: runtime.deployment.release.manifestSha256,
      runtimeContentSecurityPolicy: "default-src 'none'",
      runtimeFiles: runtime.deployment.distribution.files,
      payload: { version: 1, name: '', snapshot },
      recipe,
    }),
  )
  const collector = createPythonPlaytestCollector(recipe, () => true)
  const identity = {
    projectId: snapshot.projectId,
    revision: snapshot.revision,
    runtimeManifestSha256: runtime.deployment.release.manifestSha256,
    instanceId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    writerEpoch: null,
  }
  const session = {
    identity,
    playback: { kind: 'stop-only' },
    repl: { kind: 'unavailable' },
    subscribe: () => () => {},
    run: async () => {},
    stop: async () => {},
    dispose: async () => {},
    provideInput: async () => {},
    captureSnapshot: async () => null,
  }
  collector.observer.session?.(session)
  collector.observer.event?.({ identity, sequence: 1, type: 'state', state: 'running' })
  const failProgram = () =>
    collector.observer.event?.({
      identity,
      sequence: 2,
      type: 'failed',
      code: 'program-error',
      message: 'ImportError: absent_student_package',
    })
  if (scenario === 'stdin') failProgram()
  if (scenario === 'stdin-completed')
    collector.observer.event?.({ identity, sequence: 2, type: 'state', state: 'completed' })
  expect(Reflect.has(globalThis, '__studioPythonPlaytest')).toBe(false)
  Reflect.set(globalThis, '__studioPythonPlaytest', collector)
  page = {
    on() {},
    goto: async () => {},
    waitForFunction: async (callback) => {
      if (!callback()) throw new Error('Unexpected readiness wait')
    },
    evaluate: async (callback, argument) => callback(argument),
    frameLocator: () => ({
      locator: () => ({
        focus: async () => {},
        waitFor: async () => {},
        boundingBox: async () => {
          if (scenario === 'click-race') failProgram()
          return null
        },
      }),
    }),
    keyboard: {
      press: async () => {
        failProgram()
        throw new Error('Target closed during key dispatch')
      },
    },
    mouse: {
      click: async () => {
        throw new Error('Unexpected click after no layout')
      },
    },
    waitForTimeout: async () => {},
    frames: () => [{}],
  }
  try {
    process.chdir(directory)
    if (scenario === 'infra-click') {
      await expect(import(runner)).rejects.toThrow('Playtest canvas has no layout')
      expect(await Bun.file(path.join(directory, 'python-playtest-result.json')).exists()).toBe(
        false,
      )
    } else {
      await import(runner)
      const report = await Bun.file(path.join(directory, 'python-playtest-result.json')).json()
      expect(report.status).toBe('failed')
      expect(report.errors.join(' ')).toContain(
        scenario === 'stdin-completed' ? 'entradas da receita' : 'absent_student_package',
      )
      expect(report.input.stdinSubmitted).toBe(0)
      expect(report.input.keysDispatched).toBe(0)
      expect(report.input.clicksDispatched).toBe(0)
      expect(report.stopped).toBe(true)
    }
    expect(closed).toBe(1)
  } finally {
    process.chdir(original)
    Reflect.deleteProperty(globalThis, '__studioPythonPlaytest')
  }
})
