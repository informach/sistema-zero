import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { basename, join } from 'node:path'
import { chromium } from 'playwright'

type Policy = {
  app: string
  document: Record<string, string>
  worker: Record<string, string>
  asset: Record<string, string>
}
const policies = JSON.parse(
  await readFile('.cache/camera-csp-test/policies.json', 'utf8'),
) as Policy[]
const chunks = process.env.CAMERA_CSP_CHUNKS ?? join(process.cwd(), '../admin/.next/static/chunks')
const files = await readdir(chunks).catch(() => {
  throw new Error(
    'Build packages/admin before the production CSP rehearsal; this test requires actual Turbopack worker chunks.',
  )
})
let bootstrap: string | undefined,
  dependencies: string[] = []
for (const file of files.filter((file) => file.endsWith('.js'))) {
  const content = await readFile(join(chunks, file), 'utf8')
  if (!content.includes('sz-camera-background')) continue
  for (const match of content.matchAll(
    /\.default\("(static\/chunks\/turbopack-worker-[^"]+)",(\[[^\]]+\])\)/g,
  )) {
    const candidates = JSON.parse(match[2]!) as string[]
    for (const candidate of candidates) {
      const body = await readFile(join(chunks, basename(candidate)), 'utf8')
      if (!body.includes('selfie_segmenter_landscape.tflite')) continue
      bootstrap = match[1]
      dependencies = candidates
    }
  }
}
assert.ok(
  bootstrap && dependencies.length,
  'A real production MediaPipe worker must exist in the Admin build',
)
let policy = policies[0]!,
  blockWorkerWasm = false,
  blockDocumentWasm = false
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname
    const worker = path.startsWith('/_next/static/chunks/')
    const asset = path.startsWith('/api/live/camera-assets/')
    const headers = { ...(worker ? policy.worker : asset ? policy.asset : policy.document) }
    if ((worker && blockWorkerWasm) || (!worker && !asset && blockDocumentWasm))
      headers['Content-Security-Policy'] = headers['Content-Security-Policy']!.replaceAll(
        "'wasm-unsafe-eval'",
        '',
      )
    for (const [key, value] of Object.entries(headers)) response.setHeader(key, value)
    if (path === '/') {
      response.setHeader('Content-Type', 'text/html')
      response.end('<!doctype html><html><body><script src="/probe.js"></script></body></html>')
      return
    }
    if (path === '/probe.js') {
      response.setHeader('Content-Type', 'text/javascript')
      response.end(`
        const url = new URL('/_next/${bootstrap}', location.origin);
        url.hash = 'params=' + encodeURIComponent(JSON.stringify([${JSON.stringify(dependencies.map((path) => `/_next/${path}`).reverse())}, '', null, null]));
        const worker = new Worker(url, { name: 'sz-production-camera-csp' });
        const done = value => { window.cameraCspResult = value; worker.terminate(); };
        worker.onerror = error => done({ ok: false, message: error.message });
        worker.onmessage = async event => {
          if (event.data.type === 'error') return done({ ok: false, message: event.data.message });
          if (event.data.type === 'ready') {
            const canvas = new OffscreenCanvas(640, 360);
            const context = canvas.getContext('2d'); context.fillStyle = '#ff0000'; context.fillRect(0, 0, 640, 360);
            const bitmap = canvas.transferToImageBitmap();
            worker.postMessage({ type: 'frame', bitmap, timestamp: performance.now() }, [bitmap]);
          }
          if (event.data.type === 'frame') {
            const canvas = new OffscreenCanvas(640, 360); const context = canvas.getContext('2d');
            context.drawImage(event.data.bitmap, 0, 0); event.data.bitmap.close();
            done({ ok: true, pixel: [...context.getImageData(10, 10, 1, 1).data] });
          }
        };
        worker.postMessage({ type: 'init', effect: 'space', assetBase: new URL('/api/live/camera-assets/', location.origin).href });
      `)
      return
    }
    if (worker && files.includes(basename(path))) {
      response.setHeader('Content-Type', 'text/javascript')
      response.end(await readFile(join(chunks, basename(path))))
      return
    }
    if (
      asset &&
      /^(?:vision_wasm_(?:module_internal|internal|nosimd_internal)\.(?:js|wasm)|selfie_segmenter_landscape\.tflite)$/.test(
        basename(path),
      )
    ) {
      const name = basename(path)
      response.setHeader(
        'Content-Type',
        name.endsWith('.wasm')
          ? 'application/wasm'
          : name.endsWith('.js')
            ? 'text/javascript'
            : 'application/octet-stream',
      )
      response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
      response.end(await readFile(join(process.cwd(), '../admin/public/live-camera', name)))
      return
    }
    response.writeHead(404)
    response.end()
  } catch (error) {
    response.writeHead(500)
    response.end(String(error))
  }
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
assert.ok(address && typeof address !== 'string')
const origin = `http://127.0.0.1:${address.port}`
const browser = await chromium.launch({ headless: true, chromiumSandbox: true })
try {
  for (const current of policies) {
    policy = current
    for (const headers of [policy.document, policy.worker]) {
      const script = headers['Content-Security-Policy']!.split(';').find((part) =>
        part.trim().startsWith('script-src '),
      )!
      assert.ok(script.includes("'wasm-unsafe-eval'"))
      assert.ok(
        !script.includes("'unsafe-eval'"),
        `${policy.app} production must not rely on JavaScript eval`,
      )
    }
    for (const negative of [false, true]) {
      blockWorkerWasm = negative
      const page = await browser.newPage()
      const errors: string[] = [],
        remote: string[] = []
      page.on('console', (message) => {
        errors.push(message.text())
      })
      page.on('requestfailed', (request) =>
        errors.push(`${request.url()}: ${request.failure()?.errorText}`),
      )
      page.on('response', (response) => {
        if (!response.ok()) errors.push(`${response.status()}: ${response.url()}`)
      })
      page.on('request', (request) => {
        if (!request.url().startsWith(origin)) remote.push(request.url())
      })
      await page.goto(origin)
      await page.waitForFunction(
        () => Boolean((window as Window & { cameraCspResult?: unknown }).cameraCspResult),
        undefined,
        { timeout: 12_000 },
      )
      const result = await page.evaluate(
        () =>
          (window as Window & { cameraCspResult?: { ok: boolean; pixel?: number[] } })
            .cameraCspResult!,
      )
      assert.equal(
        result.ok,
        !negative,
        `${policy.app}: ${JSON.stringify(result)} ${errors.join('\n')}`,
      )
      if (negative)
        assert.ok(
          errors.some((message) => /wasm|webassembly/i.test(message)),
          'The negative control must fail specifically at WASM compilation',
        )
      else assert.notDeepEqual(result.pixel?.slice(0, 3), [255, 0, 0])
      assert.deepEqual(remote, [], 'Camera processing must use local assets only')
      await page.close()
    }
    // HTTP workers use their response policy; permission in the document is not a substitute.
    blockWorkerWasm = false
    blockDocumentWasm = true
    const page = await browser.newPage()
    await page.goto(origin)
    await page.waitForFunction(
      () => Boolean((window as Window & { cameraCspResult?: unknown }).cameraCspResult),
      undefined,
      { timeout: 12_000 },
    )
    assert.equal(
      await page.evaluate(
        () => (window as Window & { cameraCspResult?: { ok: boolean } }).cameraCspResult!.ok,
      ),
      true,
    )
    await page.close()
    blockDocumentWasm = false
    console.log(
      `${policy.app}: production worker processes frames; worker CSP blocks WASM when removed; document CSP is independent.`,
    )
  }
} finally {
  await browser.close()
  server.close()
}
