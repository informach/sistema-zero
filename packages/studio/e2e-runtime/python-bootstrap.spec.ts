import { expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/host'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

function gate() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

/** Observe real worker/port messages; never replace their contents or delivery. */
async function observeBootstrap(page: Page) {
  const messages: string[] = []
  await page.exposeBinding('observePythonBootstrap', (_, kind: string) => messages.push(kind))
  await page.addInitScript(() => {
    const observe = (kind: string) => {
      void (
        globalThis as typeof globalThis & {
          observePythonBootstrap(kind: string): Promise<void>
        }
      ).observePythonBootstrap(kind)
    }
    const NativeWorker = globalThis.Worker
    globalThis.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options)
        this.addEventListener('message', (event) => {
          if (event.data?.type === 'prepared') observe('worker-prepared')
        })
      }
    }
    const NativeChannel = globalThis.MessageChannel
    globalThis.MessageChannel = class extends NativeChannel {
      constructor() {
        super()
        this.port1.addEventListener('message', (event) => {
          if (event.data?.type === 'prepared') observe('host-prepared')
          if (event.data?.type === 'event' && event.data.event?.type === 'state')
            observe(`host-${event.data.event.state}`)
        })
      }
    }
  })
  return messages
}

test('Turtle renderer download does not serialize the protected Python worker boot', async ({
  page,
  context,
}) => {
  const messages = await observeBootstrap(page)
  let rendererStarted = false
  let workerStarted = false
  const release = gate()
  context.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/worker.mjs')) workerStarted = true
  })
  await context.route(/\/turtle-renderer\.mjs$/, async (route) => {
    rendererStarted = true
    await release.promise
    await route.continue()
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  const preparation = page.evaluate(() => globalThis.providerProbe.prepare('boot', 'turtleDrawing'))
  void preparation.catch(() => {})
  try {
    await expect.poll(() => rendererStarted, { timeout: 3000 }).toBe(true)
    await expect.poll(() => workerStarted, { timeout: 3000 }).toBe(true)
    await expect.poll(() => messages.includes('worker-prepared')).toBe(true)
    expect(messages.filter((kind) => kind.startsWith('host-'))).toEqual([])
    expect(await page.evaluate(() => globalThis.providerProbe.read('boot').status)).toBe('loading')
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
    expect(await frame.locator('canvas').count()).toBe(0)
    release.resolve()
    await preparation
    expect(await page.evaluate(() => globalThis.providerProbe.read('boot').status)).toBe('ready')
    await expect
      .poll(() => messages.filter((kind) => kind.startsWith('host-')))
      .toEqual(['host-ready', 'host-prepared'])
    await page.evaluate(() => globalThis.providerProbe.run('boot'))
    await page.waitForFunction(() => globalThis.providerProbe.read('boot').status === 'completed')
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
test('renderer first still waits for CPython before publishing ready and prepared', async ({
  page,
  context,
}) => {
  const messages = await observeBootstrap(page)
  const release = gate()
  let wasmStarted = false
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
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
    // Renderer construction sets up its container; canvas is deliberately lazy
    // and only exists after the learner sends the first graphics operation.
    await expect(frame.locator('body')).toHaveCSS('display', 'flex')
    expect(await frame.locator('canvas').count()).toBe(0)
    expect(messages).toEqual([])
    expect(await page.evaluate(() => globalThis.providerProbe.read('boot').status)).toBe('loading')
    release.resolve()
    await preparation
    await expect
      .poll(() => messages.filter((kind) => kind.startsWith('host-')))
      .toEqual(['host-ready', 'host-prepared'])
    await page.evaluate(() => globalThis.providerProbe.run('boot'))
    await page.waitForFunction(() => globalThis.providerProbe.read('boot').status === 'completed')
  } finally {
    release.resolve()
    await preparation.catch(() => {})
    await page.evaluate(() => globalThis.providerProbe?.dispose('boot')).catch(() => {})
  }
})

for (const termination of ['cancel', 'pagehide', 'renderer-error', 'worker-error'] as const) {
  test(`${termination} closes a parallel preparation without late readiness or canvas`, async ({
    page,
    context,
  }) => {
    const messages = await observeBootstrap(page)
    const release = gate()
    let rendererStarted = false
    let workerStarted = false
    context.on('request', (request) => {
      if (new URL(request.url()).pathname.endsWith('/worker.mjs')) workerStarted = true
    })
    await context.route(/\/turtle-renderer\.mjs$/, async (route) => {
      rendererStarted = true
      await release.promise
      if (termination === 'renderer-error') await route.abort('failed')
      else await route.continue()
    })
    if (termination === 'worker-error')
      await context.route(/\/worker\.mjs$/, (route) => route.abort('failed'))
    await page.goto('/provider')
    await page.waitForFunction(() => !!globalThis.providerProbe)
    const preparation = page.evaluate(() =>
      globalThis.providerProbe.prepare('boot', 'turtleDrawing'),
    )
    void preparation.catch(() => {})
    try {
      await expect.poll(() => rendererStarted, { timeout: 3000 }).toBe(true)
      await expect.poll(() => workerStarted, { timeout: 3000 }).toBe(true)
      if (termination !== 'worker-error')
        await expect.poll(() => messages.includes('worker-prepared')).toBe(true)
      const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))
      if (termination === 'cancel')
        await page.evaluate(() => globalThis.providerProbe.cancel('boot'))
      if (termination === 'pagehide') {
        await frame!.evaluate(() => dispatchEvent(new Event('pagehide')))
        await expect.poll(() => page.workers().length).toBe(0)
        expect(await frame!.locator('canvas').count()).toBe(0)
        expect(await frame!.locator('body').getAttribute('style')).toBeNull()
        release.resolve()
        // Let the real imported module settle in the still-attached closed frame.
        await frame!.evaluate(async () => {
          await import(new URL('./turtle-renderer.mjs', location.href).href)
        })
        expect(await frame!.locator('canvas').count()).toBe(0)
        expect(await frame!.locator('body').getAttribute('style')).toBeNull()
        await page.evaluate(() => globalThis.providerProbe.cancel('boot'))
      }
      release.resolve()
      await preparation
      await expect.poll(() => page.workers().length).toBe(0)
      expect(await page.evaluate(() => globalThis.providerProbe.read('boot').status)).toBe('failed')
      expect(messages.filter((kind) => kind === 'host-ready' || kind === 'host-prepared')).toEqual(
        [],
      )
      expect(await page.locator('canvas').count()).toBe(0)
    } finally {
      release.resolve()
      await preparation.catch(() => {})
      await page.evaluate(() => globalThis.providerProbe?.dispose('boot')).catch(() => {})
    }
  })
}

test('Python without Turtle never requests its renderer or graphical modules', async ({
  page,
  context,
}) => {
  const graphical: string[] = []
  context.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (/\/turtle-(?:renderer|protocol)\.mjs$/.test(path) || path.includes('/turtle/'))
      graphical.push(path)
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  try {
    await page.evaluate(() => globalThis.providerProbe.prepare('boot', 'portable'))
    expect(await page.evaluate(() => globalThis.providerProbe.read('boot').status)).toBe('ready')
    await page.evaluate(() => globalThis.providerProbe.run('boot'))
    await page.waitForFunction(() => globalThis.providerProbe.read('boot').status === 'completed')
    expect(graphical).toEqual([])
  } finally {
    await page.evaluate(() => globalThis.providerProbe?.dispose('boot')).catch(() => {})
  }
})

test('the authenticated private channel refuses run and capture but acknowledges Stop before the renderer', async ({
  page,
  context,
}) => {
  const messages = await observeBootstrap(page)
  const release = gate()
  await context.route(/\/turtle-renderer\.mjs$/, async (route) => {
    await release.promise
    await route.continue()
  })
  await page.goto('/supervisor?distribution')
  await page.waitForFunction(() => !!globalThis.supervisorProbe)
  try {
    await page.evaluate(() => globalThis.supervisorProbe.prepare('turtleDrawing'))
    await expect.poll(() => messages.includes('worker-prepared')).toBe(true)
    const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
    for (const type of ['run', 'capture'] as const) {
      const id = await page.evaluate((type) => globalThis.supervisorProbe.send({ type }), type)
      await expect
        .poll(() =>
          page.evaluate(
            (id) =>
              globalThis.supervisorProbe.events.find(
                (event) => event.type === 'ack' && event.commandId === id,
              ),
            id,
          ),
        )
        .toMatchObject({ type: 'ack', ok: false, error: 'O ambiente ainda não está pronto.' })
    }
    const id = await page.evaluate(() => globalThis.supervisorProbe.send({ type: 'stop' }))
    await expect
      .poll(() =>
        page.evaluate(
          (id) =>
            globalThis.supervisorProbe.events.find(
              (event) => event.type === 'ack' && event.commandId === id,
            ),
          id,
        ),
      )
      .toMatchObject({ type: 'ack', ok: true })
    await expect.poll(() => page.workers().length).toBe(0)
    release.resolve()
    await frame.evaluate(async () => {
      await import(new URL('./turtle-renderer.mjs', location.href).href)
    })
    expect(await frame.locator('body').getAttribute('style')).toBeNull()
    expect(await frame.locator('canvas').count()).toBe(0)
    const events = await page.evaluate(() => globalThis.supervisorProbe.events)
    expect(
      events.filter(
        (event) =>
          event.type === 'prepared' ||
          (event.type === 'event' &&
            event.event.type === 'state' &&
            event.event.state !== 'stopped'),
      ),
    ).toEqual([])
    expect(events.map((event) => event.sequence)).toEqual(events.map((_, index) => index + 1))
  } finally {
    release.resolve()
    await page.evaluate(() => globalThis.supervisorProbe?.destroy()).catch(() => {})
  }
})

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

test('pinned Python modules download while the execution entry is pending without starting CPython', async ({
  page,
  context,
}) => {
  const release = gate()
  let entryStarted = false
  const modules = new Set<string>()
  const dataRequests: string[] = []
  context.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (/\/pyodide(?:\.asm)?\.mjs$/.test(path)) modules.add(path.split('/').at(-1)!)
    if (/\/(?:pyodide\.asm\.wasm|python_stdlib\.zip|pyodide-lock\.json)$/.test(path))
      dataRequests.push(path)
  })
  await context.route(/\/worker\.mjs$/, async (route) => {
    entryStarted = true
    await release.promise
    await route.continue()
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  const preparation = page.evaluate(() => globalThis.providerProbe.prepare('boot', 'portable'))
  void preparation.catch(() => {})
  try {
    await expect.poll(() => entryStarted, { timeout: 3000 }).toBe(true)
    await expect
      .poll(() => [...modules].sort(), { timeout: 3000 })
      .toEqual(['pyodide.asm.mjs', 'pyodide.mjs'])
    expect(dataRequests).toEqual([])
    expect(await page.evaluate(() => globalThis.providerProbe.read('boot').status)).toBe('loading')
    release.resolve()
    await preparation
    expect(await page.evaluate(() => globalThis.providerProbe.read('boot').status)).toBe('ready')
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
