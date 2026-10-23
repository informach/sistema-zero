import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { materializeTestTemplate } from '../../studio-runtime/tests/template-files'
import { createTestProArtifact } from './helpers/proArtifact'

test('Canvas Survival stays bounded during thirty real minutes of play/restart/pause', async ({
  page,
}, info) => {
  test.skip(process.env.STUDIO_KIT_SOAK !== '1', 'Explicit thirty minute laboratory run.')
  test.setTimeout(1_860_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { allFiles } = await materializeTestTemplate('canvas-survival')
  const artifact = await createTestProArtifact(page, allFiles, 'canvas-survival')
  try {
    await page
      .locator('#game')
      .evaluate((node) =>
        Object.assign((node as HTMLElement).style, { width: '1024px', height: '640px' }),
      )
    const frame = page.frameLocator('#game')
    await frame.locator('#start').click()
    const samples = await frame.locator('body').evaluate(async () => {
      const game = (
        window as unknown as {
          __studioGame: {
            inspect(): {
              phase: string
              readiness: string
              targets?: unknown[]
              timing?: { discardedSeconds: number }
            }
          }
        }
      ).__studioGame
      const rows: {
        minute: number
        nodes: number
        canvases: number
        targets: number
        phase: string
        readiness: string
      }[] = []
      const started = performance.now()
      let direction = false,
        restarts = 0,
        lastMinute = -1
      while (performance.now() - started < 30 * 60 * 1000) {
        const snapshot = game.inspect()
        if (snapshot.phase !== 'playing') {
          document.querySelector<HTMLButtonElement>('#restart')!.click()
          restarts++
        }
        const old = direction ? 'ArrowRight' : 'ArrowLeft'
        direction = !direction
        window.dispatchEvent(new KeyboardEvent('keyup', { code: old }))
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))
        window.dispatchEvent(
          new KeyboardEvent('keydown', { code: direction ? 'ArrowRight' : 'ArrowLeft' }),
        )
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
        const minute = Math.floor((performance.now() - started) / 60000)
        if (minute !== lastMinute) {
          lastMinute = minute
          rows.push({
            minute,
            nodes: document.querySelectorAll('*').length,
            canvases: document.querySelectorAll('canvas').length,
            targets: snapshot.targets?.length ?? 0,
            phase: snapshot.phase,
            readiness: snapshot.readiness,
          })
          document.querySelector<HTMLButtonElement>('#pause')!.click()
          await new Promise((resolve) => setTimeout(resolve, 100))
          document.querySelector<HTMLButtonElement>('#start')!.click()
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      return {
        rows,
        restarts,
        elapsedMs: performance.now() - started,
        userAgent: navigator.userAgent,
        logicalProcessors: navigator.hardwareConcurrency,
      }
    })
    expect(samples.elapsedMs).toBeGreaterThanOrEqual(1_800_000)
    expect(samples.rows).toHaveLength(30)
    expect(samples.restarts).toBeGreaterThan(10)
    expect(new Set(samples.rows.map((row) => row.nodes)).size).toBe(1)
    for (const row of samples.rows) {
      expect(row.canvases).toBe(1)
      expect(row.targets).toBeLessThanOrEqual(64)
      expect(row.readiness).toBe('ready')
    }
    expect(errors).toEqual([])
    const path = fileURLToPath(new URL('../.cache/studio-kit-performance/', import.meta.url))
    await mkdir(path, { recursive: true })
    const report = {
      scope:
        'Real thirty minute isolated compiled Canvas iframe; synthetic input; no authenticated host or physical device claim',
      measuredAt: new Date().toISOString(),
      ...samples,
    }
    await writeFile(`${path}/canvas-survival-soak.json`, JSON.stringify(report, null, 2))
    await info.attach('soak', { body: JSON.stringify(report), contentType: 'application/json' })
  } finally {
    await artifact.dispose()
  }
})
