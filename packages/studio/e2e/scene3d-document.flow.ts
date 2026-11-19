import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { THREE_CDN } from '../src/three/threeRuntimeContract'

interface Receipt {
  error?: string
  origin: string
  aborted: boolean
  image: string
  final: { geometries: number; textures: number }
  cycles: Array<{
    sameThree: boolean
    instances: string[]
    height: number
    active: { geometries: number; calls: number }
    after: { geometries: number; textures: number }
    children: number
    trees: number
  }>
}
declare global {
  interface Window {
    scene3dPublicResults?: Receipt[]
  }
}

for (const mode of ['preview', 'export'] as const) {
  test.describe(mode, () => {
    // Playwright's SW-blocking init script itself cannot access serviceWorker in
    // an opaque sandbox. Only the exported PWA needs that separate test policy.
    test.use({ serviceWorkers: mode === 'export' ? 'block' : 'allow' })
    test(`${mode}: cena pública usa os canais reais, desenha e libera recursos em três ciclos`, async ({
      page,
    }, info) => {
      const errors: string[] = []
      const network: string[] = []
      const expected = (await (await page.request.get('/fixture.json')).json()) as {
        nodes: string[]
      }
      // The compiler emits both the physical terrain and the authored model as nodes.
      expect(expected.nodes).toHaveLength(2)
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('request', (request) => {
        if (['fetch', 'xhr'].includes(request.resourceType())) network.push(request.url())
      })
      await page.route('https://esm.sh/**', async (route) => {
        const url = new URL(route.request().url())
        const name =
          route.request().url() === THREE_CDN
            ? 'three'
            : url.pathname.endsWith('/GLTFLoader.js')
              ? 'GLTFLoader'
              : url.pathname.endsWith('/SkeletonUtils.js')
                ? 'SkeletonUtils'
                : null
        if (!name) throw Error(`Import inesperado: ${url.pathname}`)
        await route.fulfill({
          contentType: 'text/javascript',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: await readFile(resolve('.cache/mission/scene3d-public-proof', `${name}.js`)),
        })
      })
      await page.addInitScript(() => {
        window.scene3dPublicResults = []
        window.addEventListener('message', (event) => {
          const frame = document.querySelector<HTMLIFrameElement>('#scene-proof')
          if (
            event.data?.tag === 'studio-scene3d-public' &&
            (event.source === window || event.source === frame?.contentWindow)
          )
            window.scene3dPublicResults!.push(event.data.result)
        })
      })
      if (mode === 'preview') {
        await page.goto('/')
        await page.evaluate(() => {
          const frame = document.createElement('iframe')
          frame.id = 'scene-proof'
          frame.title = 'Cena pública no sandbox'
          frame.setAttribute('sandbox', 'allow-scripts')
          frame.src = '/preview.html'
          frame.width = '320'
          frame.height = '240'
          document.body.append(frame)
        })
      } else await page.goto('/export/public/index.html')
      await expect.poll(() => page.evaluate(() => window.scene3dPublicResults?.length ?? 0)).toBe(1)
      const receipt = await page.evaluate(() => window.scene3dPublicResults![0]!)
      const { image, ...summary } = receipt
      const receiptPath = info.outputPath('scene-receipt.json')
      await writeFile(receiptPath, JSON.stringify(summary, null, 2))
      await info.attach('scene-receipt.json', {
        path: receiptPath,
        contentType: 'application/json',
      })
      expect(receipt.error).toBeUndefined()
      expect(receipt.aborted).toBe(true)
      if (mode === 'preview') expect(receipt.origin).toBe('null')
      expect(receipt.cycles).toHaveLength(3)
      for (const cycle of receipt.cycles) {
        expect(cycle.sameThree).toBe(true)
        expect(cycle.instances).toEqual(expected.nodes)
        expect(cycle.height).toBeCloseTo(0, 6)
        expect(cycle.active.geometries).toBeGreaterThan(0)
        expect(cycle.active.calls).toBeGreaterThan(0)
        expect(cycle.children).toBe(0)
        expect(cycle.trees).toBe(0)
        expect(cycle.after).toEqual(receipt.cycles[0]!.after)
      }
      expect(errors).toEqual([])
      expect(network).toEqual([])
      expect(receipt.final).toEqual({ geometries: 0, textures: 0 })
      expect(receipt.image).toMatch(/^data:image\/png;base64,/)
      const framePath = info.outputPath(`${mode}-rendered-frame.png`)
      await writeFile(framePath, Buffer.from(image.split(',')[1]!, 'base64'))
      await info.attach(`${mode}-rendered-frame.png`, {
        path: framePath,
        contentType: 'image/png',
      })
    })
  })
}
