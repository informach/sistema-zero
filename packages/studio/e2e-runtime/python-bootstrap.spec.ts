import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

function gate() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test('execution entry downloads beside the reader but cannot start CPython before reader configuration', async ({
  page,
  context,
}) => {
  let readerStarted = false
  const release = gate()
  let entryURL: string | undefined
  const dataRequests: string[] = []
  context.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (path.endsWith('/worker.mjs')) entryURL = request.url()
    if (/\/(?:pyodide\.asm\.wasm|python_stdlib\.zip|pyodide-lock\.json)$/.test(path))
      dataRequests.push(path)
  })
  await context.route(/\/boot-reader\.mjs$/, async (route) => {
    readerStarted = true
    await release.promise
    await route.continue()
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  const preparation = page.evaluate(() => globalThis.providerProbe.prepare('boot', 'portable'))
  void preparation.catch(() => {})
  try {
    await expect.poll(() => readerStarted, { timeout: 3000 }).toBe(true)
    await expect.poll(() => entryURL, { timeout: 3000 }).toBeTruthy()
    expect(dataRequests).toEqual([])
    release.resolve()
    await preparation
    expect(await page.evaluate(() => globalThis.providerProbe.read('boot').status)).toBe('ready')
    const worker = page.workers().find((candidate) => candidate.url().startsWith('blob:'))
    if (!worker || !entryURL) throw new Error('Execution worker was not observed.')
    expect(
      await worker.evaluate(async (url) => {
        const entry = await import(/* @vite-ignore */ url)
        try {
          await entry.startPythonWorker({ turtle: false })
          return 'accepted second startup'
        } catch (error) {
          return error instanceof Error ? error.message : String(error)
        }
      }, entryURL),
    ).toContain('já foi iniciado')
    await page.evaluate(() => globalThis.providerProbe.run('boot'))
    await page.waitForFunction(() => globalThis.providerProbe.read('boot').status === 'completed')
  } finally {
    release.resolve()
    await preparation.catch(() => {})
    await page.evaluate(() => globalThis.providerProbe?.dispose('boot')).catch(() => {})
  }
})

test('the pinned loader and asm module download concurrently without invoking asm early', async ({
  page,
  context,
}) => {
  let loaderStarted = false
  const release = gate()
  let asmRequested = false
  context.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/pyodide.asm.mjs')) asmRequested = true
  })
  await context.route(/\/pyodide\.mjs$/, async (route) => {
    loaderStarted = true
    await release.promise
    await route.continue()
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  const preparation = page.evaluate(() => globalThis.providerProbe.prepare('boot', 'portable'))
  void preparation.catch(() => {})
  try {
    await expect.poll(() => loaderStarted, { timeout: 3000 }).toBe(true)
    await expect.poll(() => asmRequested, { timeout: 3000 }).toBe(true)
    release.resolve()
    await preparation
    expect(await page.evaluate(() => globalThis.providerProbe.read('boot').status)).toBe('ready')
  } finally {
    release.resolve()
    await preparation.catch(() => {})
    await page.evaluate(() => globalThis.providerProbe?.dispose('boot')).catch(() => {})
  }
})

test('only an installed Turtle preloads its protocol and four sources while CPython data is pending', async ({
  page,
  context,
}) => {
  let wasmStarted = false
  const release = gate()
  const resources = new Set<string>()
  context.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (path.endsWith('/turtle-protocol.mjs') || path.includes('/turtle/'))
      resources.add(path.split('/').at(-1)!)
  })
  await context.route(/\/pyodide\.asm\.wasm$/, async (route) => {
    wasmStarted = true
    await release.promise
    await route.continue()
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  const preparation = page.evaluate(() => globalThis.providerProbe.prepare('boot', 'turtleDrawing'))
  void preparation.catch(() => {})
  try {
    await expect.poll(() => wasmStarted, { timeout: 3000 }).toBe(true)
    await expect
      .poll(() => [...resources].sort(), { timeout: 3000 })
      .toEqual([
        '_sz_turtle_backend.py',
        '_sz_turtle_colors.py',
        '_sz_turtle_limits.py',
        'turtle-protocol.mjs',
        'turtle.py',
      ])
    release.resolve()
    await preparation
    await page.evaluate(() => globalThis.providerProbe.run('boot'))
    await page.waitForFunction(() => globalThis.providerProbe.read('boot').status === 'completed')
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
    expect(
      await frame.evaluate(() => {
        const canvas = document.querySelector('canvas')!
        return [...canvas.getContext('2d')!.getImageData(250, 150, 1, 1).data]
      }),
    ).toEqual([255, 0, 0, 255])
  } finally {
    release.resolve()
    await preparation.catch(() => {})
    await page.evaluate(() => globalThis.providerProbe?.dispose('boot')).catch(() => {})
  }
})
