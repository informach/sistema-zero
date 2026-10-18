import { expect, test } from '@playwright/test'
import { StudioPythonDistributionSchema } from '@sistemazero/core/studio/python-runtime-distribution'
import { PYTHON_BOOT_CACHE_PREFIX } from '../src/runtime/python/bootResourceManifest'
import { installDrawingTiming, type RunClickClock } from './fixtures/drawingTiming'
import type {} from './fixtures/live'
import { turtleF1Source } from './fixtures/performance'
import { tracePythonFrameLayout } from './layout-diagnostic'

// DOM snapshot recording is observable CPU work, not part of the child's Studio.
// Keep it in functional suites; performance diagnosis uses only opt-in CPU traces.
test.use({ trace: 'off' })
const f1 = process.env.PYTHON_LIVE_WORKLOAD === 'f1'

for (const kind of ['classic', 'pro'] as const)
  test(`diagnostic live ${kind}: execute cold, cached and after editing to presented drawing`, async ({
    page,
    request,
    browser,
  }, testInfo) => {
    test.setTimeout(90000)
    const evidence = {
      browser: browser.version(),
      kind,
      workload: f1 ? 'F1: 2 turtles, 200 movement calls, no external assets' : 'small drawing',
      repetition: testInfo.repeatEachIndex,
      scope:
        'Diagnostic: trusted DOM click to first useful bitmap sampled by read-only rAF in the fresh frame (not GPU/compositor time). Automation dispatch and observer latency recorded separately; Playwright DOM tracing off, optional CPU trace overhead remains when enabled. Edited source accepted before clicking. Real room editor/runtime, controlled actors/storage; one sample per phase per repetition. F1 clears HTTP cache and only the tested runtime CacheStorage generation before cold click after editor/parser preparation; response shaping recorded when enabled, not full upload/RTT/NIC emulation. No video or reference-PC qualification.',
      distribution: await (await request.get('http://127.0.0.1:5297/distribution')).json(),
      coldCacheReset: undefined as { name: string; existed: boolean; removed: boolean } | undefined,
      samples: [] as {
        phase: string
        milliseconds: number
        observedMilliseconds: number
        dispatchMilliseconds: number
        targetMs: number
        passed: boolean
        network?: { deliveredBytes: number; bytesPerSecond: number; responseDelayMs: number }
        networkError?: string
        runtimeResponses?: {
          path: string
          encoding: string
          representationBytes: number
          framing: 'length' | 'chunked'
        }[]
      }[],
    }
    const manifest = StudioPythonDistributionSchema.parse(evidence.distribution.manifest)
    const descriptors = new Map(manifest.files.map((file) => [file.path, file]))
    const gzipFiles = new Map(
      manifest.httpRepresentations?.map((item) => [item.path, descriptors.get(item.artifactPath)!]),
    )
    const runtimePrefix = `/v1/runtimes/${evidence.distribution.release.manifestSha256}/`
    let collecting:
      | {
          path: string
          encoding: string
          representationBytes: number
          framing: 'length' | 'chunked'
        }[]
      | undefined
    const responseErrors: string[] = []
    page.on('response', (response) => {
      const pathname = new URL(response.url()).pathname
      if (!collecting || response.status() !== 200 || !pathname.startsWith(runtimePrefix)) return
      const path = pathname.slice(runtimePrefix.length)
      const headers = response.headers()
      const encoding = headers['content-encoding'] ?? 'identity'
      const file =
        encoding === 'gzip'
          ? gzipFiles.get(path)
          : encoding === 'identity'
            ? descriptors.get(path)
            : undefined
      // Bun's deliberately delayed network-shaping stream can use legal HTTP/1.1
      // chunked framing. Its measured body counter still counts the encoded bytes.
      const chunked =
        headers['content-length'] === undefined && headers['transfer-encoding'] === 'chunked'
      if (
        !file ||
        headers.etag !== `"${file.sha256}"` ||
        (!chunked && headers['content-length'] !== String(file.bytes))
      ) {
        responseErrors.push(
          JSON.stringify({
            url: response.url(),
            path,
            encoding,
            expected: file && { bytes: file.bytes, sha256: file.sha256 },
            received: {
              etag: headers.etag,
              length: headers['content-length'],
              transfer: headers['transfer-encoding'],
            },
          }),
        )
        return
      }
      // Headers only: do not read response bodies, capture images or trace CPU inside the timed interval.
      collecting.push({
        path,
        encoding,
        representationBytes: file.bytes,
        framing: chunked ? 'chunked' : 'length',
      })
    })
    try {
      expect(
        (
          await request.post(`/live-probe/setup?kind=${kind}&workload=${f1 ? 'f1' : 'drawing'}`)
        ).ok(),
      ).toBe(true)
      await installDrawingTiming(page)
      await page.goto('/')
      await page.waitForFunction(() => !!globalThis.studioLiveProbe)
      await page.evaluate(() => studioLiveProbe.create('child'))
      await expect(page.getByRole('button', { name: 'Executar', exact: true })).toBeEnabled()
      if (f1) {
        await expect
          .poll(() => page.evaluate(() => studioLiveProbe.read()))
          .toBe(turtleF1Source('red'))
        // Open actual output before timing. Classic hides Console by default;
        // Pro does not mount it until its tab is visited.
        await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
        const consoleMenu = page.getByRole('menuitem', { name: 'Console', exact: true })
        if ((await consoleMenu.getAttribute('aria-current')) !== 'true') await consoleMenu.click()
        else await page.keyboard.press('Escape')
        if (kind === 'pro') {
          const consoleTab = page.getByRole('button', { name: 'Console', exact: true })
          if ((await consoleTab.getAttribute('aria-expanded')) !== 'true') await consoleTab.click()
        }
        await expect(page.getByRole('button', { name: 'Limpar', exact: true })).toBeVisible()
        if (kind === 'classic') {
          // Executar/Monaco readiness does not imply that the blocks parser has
          // finished its own download. Do not clear its in-flight HTTP cache.
          const editor = page.locator('section[aria-label="Editor de blocos Python"]')
          await expect(editor).toBeAttached({ timeout: 45000 })
          await expect
            .poll(() => editor.evaluate((element) => element.hasAttribute('inert')), {
              timeout: 45000,
            })
            .toBe(false)
        }
        const session = await page.context().newCDPSession(page)
        try {
          await session.send('Network.enable')
          await session.send('Network.clearBrowserCache')
        } finally {
          await session.detach()
        }
        const configuration = await (
          await request.get('http://127.0.0.1:5297/configuration')
        ).json()
        const directory = new URL('./', configuration.providerFrameURL).href
        const cacheName = `${PYTHON_BOOT_CACHE_PREFIX}${encodeURIComponent(directory)}:${evidence.distribution.release.manifestSha256}`
        evidence.coldCacheReset = await page.evaluate(async (name) => {
          const before = await caches.keys()
          const existed = before.includes(name)
          const removed = await caches.delete(name)
          const after = await caches.keys()
          if (
            after.includes(name) ||
            existed !== removed ||
            before.filter((key) => key !== name).some((key) => !after.includes(key))
          )
            throw new Error('A limpeza do cache de boot alterou entradas fora da geração em teste.')
          return { name, existed, removed }
        }, cacheName)
      }
      for (const phase of ['cold', 'cached', 'edited'] as const) {
        const finishTrace =
          phase === 'edited'
            ? await tracePythonFrameLayout(page, testInfo, { cpu: true })
            : async () => {}
        let phaseFailure: unknown
        let phaseFailed = false
        try {
          if (phase === 'edited') {
            const source = f1
              ? turtleF1Source('black')
              : 'import turtle\nturtle.hideturtle()\nturtle.speed(0)\nturtle.pensize(6)\nturtle.forward(60)\nturtle.done()\n'
            await page.evaluate((source) => studioLiveProbe.source(source), source)
            await expect(
              page.getByText('Seu código mudou. Clique em Reiniciar para executar a nova versão.'),
            ).toBeVisible()
          }
          const previous =
            phase === 'cold'
              ? null
              : await page.locator('iframe[title="Pré-visualização Python"]').elementHandle()
          collecting = []
          const networkBefore = await (
            await request.get('http://127.0.0.1:5297/network', { timeout: 5000 })
          ).json()
          const requestedAt = await page.evaluate(() => {
            const clock = globalThis as typeof globalThis & RunClickClock
            clock.studioRunClickedAt = undefined
            return performance.timeOrigin + performance.now()
          })
          await page
            .getByRole('button', { name: phase === 'cold' ? 'Executar' : 'Reiniciar', exact: true })
            .click()
          if (previous) {
            // Do not accidentally time the previous generation's already drawn canvas.
            await expect
              .poll(() => previous.evaluate((element) => element.isConnected).catch(() => false))
              .toBe(false)
            await previous.dispose()
          }
          const canvas = page
            .frameLocator('iframe[title="Pré-visualização Python"]')
            .locator('canvas')
          await expect(canvas).toBeVisible({ timeout: 30000 })
          // A visible canvas can precede Python's first rendered operation. Inspect the
          // actual line at world (25, 0), away from the initial turtle's cursor.
          await expect
            .poll(
              async () =>
                canvas.evaluate((element, edited) => {
                  if (!(element instanceof HTMLCanvasElement))
                    throw new Error('Expected Turtle canvas')
                  const pixel = globalThis.studioDrawingTimestamp?.pixel
                  if (!pixel) return false
                  return edited
                    ? pixel[0]! < 80 && pixel[1]! < 80 && pixel[2]! < 80 && pixel[3] === 255
                    : pixel[0]! > 200 && pixel[1]! < 80 && pixel[2]! < 80 && pixel[3] === 255
                }, phase === 'edited'),
              { timeout: 30000 },
            )
            .toBe(true)
          const drawing = await canvas.evaluate(() => globalThis.studioDrawingTimestamp)
          if (!drawing) throw new Error('Missing first drawing timestamp')
          const clickedAt = await page.evaluate(
            () => (globalThis as typeof globalThis & RunClickClock).studioRunClickedAt,
          )
          if (clickedAt === undefined) throw new Error('Missing trusted execution click timestamp')
          const milliseconds = drawing.at - clickedAt
          const observedMilliseconds =
            (await page.evaluate(() => performance.timeOrigin + performance.now())) - clickedAt
          const dispatchMilliseconds = clickedAt - requestedAt
          expect(milliseconds).toBeGreaterThanOrEqual(0)
          expect(dispatchMilliseconds).toBeGreaterThanOrEqual(0)
          expect(observedMilliseconds).toBeGreaterThanOrEqual(milliseconds)
          const targetMs = phase === 'cold' ? 12000 : phase === 'cached' ? 3000 : 1500
          const sample: (typeof evidence.samples)[number] = {
            phase,
            milliseconds,
            observedMilliseconds,
            dispatchMilliseconds,
            targetMs,
            passed: milliseconds <= targetMs,
          }
          // A secondary counter must never erase an already measured interval.
          evidence.samples.push(sample)
          sample.runtimeResponses = collecting
          let networkAfter: unknown
          try {
            networkAfter = await (
              await request.get('http://127.0.0.1:5297/network', { timeout: 5000 })
            ).json()
          } catch (error) {
            sample.networkError = String(error)
            throw error
          }
          const network =
            networkBefore &&
            networkAfter &&
            typeof networkAfter === 'object' &&
            'deliveredBytes' in networkAfter &&
            typeof networkAfter.deliveredBytes === 'number'
              ? {
                  deliveredBytes: networkAfter.deliveredBytes - networkBefore.deliveredBytes,
                  bytesPerSecond: networkBefore.bytesPerSecond,
                  responseDelayMs: networkBefore.responseDelayMs,
                }
              : undefined
          if (network) sample.network = network
          expect(responseErrors).toEqual([])
          if (f1) {
            await expect(page.getByText('f1-ready 60.0 60.0', { exact: true })).toHaveCount(1)
            const secondLine = await canvas.evaluate((element) => {
              if (!(element instanceof HTMLCanvasElement)) throw new Error('Expected Turtle canvas')
              const context = element.getContext('2d')!
              return [
                ...context.getImageData(
                  Math.floor(element.width / 2) + 59,
                  Math.floor(element.height / 2) + 40,
                  1,
                  1,
                ).data,
              ]
            })
            expect(secondLine).toEqual([0, 0, 255, 255])
            if (phase === 'cold' && network) {
              expect(network).toMatchObject({ bytesPerSecond: 2_500_000, responseDelayMs: 80 })
              const bootPaths = new Set([
                'frame.html',
                'frame.mjs',
                'worker.mjs',
                'pyodide.mjs',
                'pyodide.asm.mjs',
                'pyodide.asm.wasm',
                'python_stdlib.zip',
              ])
              const downloaded = sample.runtimeResponses ?? []
              for (const path of bootPaths)
                expect(
                  downloaded.some((file) => file.path === path),
                  path,
                ).toBe(true)
              const bootBytes = downloaded
                .filter((file) => bootPaths.has(file.path))
                .reduce((total, file) => total + file.representationBytes, 0)
              expect(bootBytes).toBeGreaterThan(0)
              expect(network.deliveredBytes).toBeGreaterThanOrEqual(bootBytes)
            }
          }
          await testInfo.attach(`drawing-${phase}`, {
            body: await canvas.screenshot(),
            contentType: 'image/png',
          })
        } catch (error) {
          phaseFailure = error
          phaseFailed = true
        } finally {
          collecting = undefined
          try {
            await finishTrace()
          } catch (error) {
            await testInfo.attach('cpu-trace-error', {
              body: String(error),
              contentType: 'text/plain',
            })
            if (!phaseFailed) {
              phaseFailure = error
              phaseFailed = true
            }
          }
        }
        if (phaseFailed) throw phaseFailure
      }
    } finally {
      await testInfo.attach('live-startup-diagnostic', {
        body: JSON.stringify(evidence, null, 2),
        contentType: 'application/json',
      })
      await page.evaluate(() => globalThis.studioLiveProbe?.close()).catch(() => undefined)
    }
  })
